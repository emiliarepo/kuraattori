import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";

import { addDays, todayInHelsinki } from "~/domain/dates";
import {
  EDITION_REGIONS,
  editionRegionBySlug,
  isSunday,
  latestSunday,
  selectEdition,
  type EditionSelection,
} from "~/domain/edition";
import { batchedByIds } from "~/server/api/batch";
import { groupExhibitionRows } from "~/server/api/grouping";
import { onlyExhibitions, withDetails } from "~/server/api/routers/exhibition";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { cached } from "~/server/cache/kv-cache";
import { endDateOrFar } from "~/server/db/expressions";
import {
  editions,
  exhibitionCategories,
  exhibitions,
  museums,
} from "~/server/db/schema";
import type { Db } from "~/server/db";

/** A stored edition never changes, so this only bounds how long KV keeps it. */
const EDITION_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const ARCHIVE_LIMIT = 52;

const regionSlug = z.enum(
  EDITION_REGIONS.map((entry) => entry.slug) as [string, ...string[]],
);

async function computeSelection(
  db: Db,
  region: string,
  date: string,
): Promise<EditionSelection> {
  const rows = await db
    .select({ exhibition: exhibitions, museum: museums })
    .from(exhibitions)
    .innerJoin(museums, eq(exhibitions.museumId, museums.id))
    .where(
      and(
        onlyExhibitions,
        gte(endDateOrFar, date),
        lte(exhibitions.startDate, addDays(date, 7)),
        eq(museums.region, region),
      ),
    );
  const groups = groupExhibitionRows(rows);
  const categoryRows = await batchedByIds(
    groups.map((group) => group.exhibition.id),
    (batch) =>
      db
        .select({ exhibitionId: exhibitionCategories.exhibitionId })
        .from(exhibitionCategories)
        .where(inArray(exhibitionCategories.exhibitionId, batch)),
  );
  const categoryCounts = new Map<number, number>();
  for (const { exhibitionId } of categoryRows)
    categoryCounts.set(
      exhibitionId,
      (categoryCounts.get(exhibitionId) ?? 0) + 1,
    );
  return selectEdition(
    groups.map(({ exhibition }) => ({
      id: exhibition.id,
      museumId: exhibition.museumId,
      startDate: exhibition.startDate,
      endDate: exhibition.endDate,
      categoryCount: categoryCounts.get(exhibition.id) ?? 0,
      hasImage: Boolean(exhibition.imageUrl ?? exhibition.imageArchiveKey),
    })),
    date,
  );
}

async function readStored(db: Db, region: string, date: string) {
  const [row] = await db
    .select({
      leadId: editions.leadId,
      endingIds: editions.endingIds,
      openingIds: editions.openingIds,
      gemId: editions.gemId,
    })
    .from(editions)
    .where(and(eq(editions.region, region), eq(editions.date, date)));
  return row ?? null;
}

/**
 * The stored edition, generated on first request for the latest Sunday only:
 * older Sundays can't be recomputed faithfully once their exhibitions change.
 */
export async function getEditionSelection(
  db: Db,
  region: string,
  date: string,
): Promise<EditionSelection | null> {
  if (date > latestSunday(todayInHelsinki())) return null;
  return cached(
    `edition:${region}:${date}`,
    EDITION_CACHE_TTL_SECONDS,
    async () => {
      const stored = await readStored(db, region, date);
      if (stored || date !== latestSunday(todayInHelsinki())) return stored;
      const selection = await computeSelection(db, region, date);
      await db
        .insert(editions)
        .values({ region, date, ...selection })
        .onConflictDoNothing();
      return readStored(db, region, date);
    },
  );
}

export const editionRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({ region: regionSlug, date: z.string() }))
    .query(async ({ ctx, input }) => {
      const region = editionRegionBySlug(input.region)!.region;
      if (!isSunday(input.date)) return null;
      const selection = await getEditionSelection(ctx.db, region, input.date);
      if (!selection) return null;
      const ids = [
        ...new Set(
          [
            selection.leadId,
            ...selection.endingIds,
            ...selection.openingIds,
            selection.gemId,
          ].filter((id): id is number => id !== null),
        ),
      ];
      const rows = await batchedByIds(ids, (batch) =>
        ctx.db
          .select({ exhibition: exhibitions, museum: museums })
          .from(exhibitions)
          .innerJoin(museums, eq(exhibitions.museumId, museums.id))
          .where(inArray(exhibitions.id, batch)),
      );
      const items = await withDetails(
        ctx.db,
        rows,
        ctx.session?.user?.id ?? null,
      );
      const byId = new Map(items.map((item) => [item.id, item]));
      const pick = (id: number | null) =>
        id === null ? null : (byId.get(id) ?? null);
      const pickAll = (list: number[]) =>
        list.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
      return {
        lead: pick(selection.leadId),
        ending: pickAll(selection.endingIds),
        opening: pickAll(selection.openingIds),
        gem: pick(selection.gemId),
      };
    }),
  archive: publicProcedure
    .input(z.object({ region: regionSlug }))
    .query(async ({ ctx, input }) => {
      const region = editionRegionBySlug(input.region)!.region;
      const rows = await ctx.db
        .select({ date: editions.date })
        .from(editions)
        .where(eq(editions.region, region))
        .orderBy(desc(editions.date))
        .limit(ARCHIVE_LIMIT);
      return rows.map((row) => row.date);
    }),
});
