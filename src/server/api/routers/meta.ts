import { and, desc, eq, gte, sql } from "drizzle-orm";

import { todayInHelsinki } from "~/domain/dates";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { cached } from "~/server/cache/kv-cache";
import { endDateOrFar } from "~/server/db/expressions";
import { dataSources, exhibitions, museums } from "~/server/db/schema";

/** Both only change on import, which runs nightly. */
const IMPORT_DERIVED_CACHE_TTL_SECONDS = 6 * 60 * 60;
/** Ended pages stay reachable, but the importer never deletes, so an unbounded sitemap would outgrow the read budget. */
const SITEMAP_ENDED_WITHIN_DAYS = 365;

/**
 * Small queries that don't belong to exhibition/museum but that pages need
 * and the existing routers don't expose: import recency for the stale-data
 * notice, whether the Museokortti exception filter has anything to filter
 * (docs/design.md: hidden when every exhibition is eligible), and the
 * sitemap's slugs.
 */
export const metaRouter = createTRPCRouter({
  lastImportAt: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ at: dataSources.lastSuccessfulImportAt })
      .from(dataSources)
      .where(eq(dataSources.enabled, true))
      .orderBy(desc(dataSources.lastSuccessfulImportAt))
      .limit(1);
    return row?.at?.toISOString() ?? null;
  }),
  hasIneligibleExhibitions: publicProcedure.query(({ ctx }) =>
    cached(
      "has-ineligible-exhibitions",
      IMPORT_DERIVED_CACHE_TTL_SECONDS,
      async () => {
        const [row] = await ctx.db
          .select({ exists: sql<number>`1` })
          .from(exhibitions)
          .where(eq(exhibitions.museumCardEligible, false))
          .limit(1);
        return row !== undefined;
      },
    ),
  ),
  sitemapEntries: publicProcedure.query(({ ctx }) =>
    cached("sitemap-entries", IMPORT_DERIVED_CACHE_TTL_SECONDS, async () => {
      const endedSince = new Date(`${todayInHelsinki()}T00:00:00Z`);
      endedSince.setUTCDate(
        endedSince.getUTCDate() - SITEMAP_ENDED_WITHIN_DAYS,
      );
      const [exhibitionRows, museumRows] = await Promise.all([
        ctx.db
          .select({
            id: exhibitions.id,
            slug: exhibitions.slug,
            updatedAt: exhibitions.updatedAt,
            group: exhibitions.exhibitionGroup,
          })
          .from(exhibitions)
          .where(
            and(
              eq(exhibitions.kind, "exhibition"),
              gte(endDateOrFar, endedSince.toISOString().slice(0, 10)),
            ),
          ),
        ctx.db
          .select({ slug: museums.slug, updatedAt: museums.updatedAt })
          .from(museums),
      ]);
      const serialize = (row: { slug: string; updatedAt: Date | null }) => ({
        slug: row.slug,
        updatedAt: row.updatedAt?.toISOString() ?? null,
      });
      // One URL per group: the lowest-id member, which the detail page names as canonical.
      const seenGroups = new Set<string>();
      const canonicalRows = exhibitionRows
        .sort((a, b) => a.id - b.id)
        .filter((row) => {
          if (row.group === null) return true;
          if (seenGroups.has(row.group)) return false;
          seenGroups.add(row.group);
          return true;
        });
      return {
        exhibitions: canonicalRows.map(serialize),
        museums: museumRows.map(serialize),
      };
    }),
  ),
});
