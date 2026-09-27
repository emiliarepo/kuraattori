import { and, asc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { cached } from "~/server/cache/kv-cache";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { exhibitions, museums } from "~/server/db/schema";
import { deserializeMuseum, serializeMuseum } from "~/server/db/serialize";
import { onlyExhibitions, whereVisible, withDetails } from "./exhibition";

const MUSEUMS_CACHE_TTL_SECONDS = 60 * 60;

export const museumRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await cached(
      "museums",
      MUSEUMS_CACHE_TTL_SECONDS,
      async () => {
        const rows = await ctx.db
          .select()
          .from(museums)
          .orderBy(asc(museums.name));
        return rows.map(serializeMuseum);
      },
    );
    return rows.map(deserializeMuseum);
  }),
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(
      async ({ ctx, input }) =>
        (
          await ctx.db
            .select()
            .from(museums)
            .where(eq(museums.slug, input.slug))
            .limit(1)
        )[0] ?? null,
    ),
  exhibitions: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        state: z.enum(["current", "upcoming", "ended"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const museum = (
        await ctx.db
          .select()
          .from(museums)
          .where(eq(museums.slug, input.slug))
          .limit(1)
      )[0];
      if (!museum) return [];
      const userId = ctx.session?.user?.id ?? null;
      const ownRows = await ctx.db
        .select({
          id: exhibitions.id,
          exhibitionGroup: exhibitions.exhibitionGroup,
        })
        .from(exhibitions)
        .where(
          and(
            eq(exhibitions.museumId, museum.id),
            onlyExhibitions,
            whereVisible(userId),
          ),
        )
        .orderBy(asc(exhibitions.startDate));
      if (!ownRows.length) return [];

      // A group's other venues can sit at other museums, so pull every row
      // sharing one of this museum's group keys (plus its own group-less
      // rows) in one query instead of resolving each exhibition on its own.
      const groupKeys = [
        ...new Set(
          ownRows.flatMap((row) =>
            row.exhibitionGroup ? [row.exhibitionGroup] : [],
          ),
        ),
      ];
      const singletonIds = ownRows
        .filter((row) => row.exhibitionGroup === null)
        .map((row) => row.id);
      const allRows = await ctx.db
        .select({ exhibition: exhibitions, museum: museums })
        .from(exhibitions)
        .innerJoin(museums, eq(exhibitions.museumId, museums.id))
        .where(
          or(
            groupKeys.length
              ? inArray(exhibitions.exhibitionGroup, groupKeys)
              : undefined,
            singletonIds.length
              ? inArray(exhibitions.id, singletonIds)
              : undefined,
          ),
        );
      const items = await withDetails(ctx.db, allRows, userId);
      const itemByMemberId = new Map(
        items.flatMap((item) =>
          item.memberIds.map((id) => [id, item] as const),
        ),
      );
      const seen = new Set<number>();
      const ordered = ownRows.flatMap((row) => {
        const item = itemByMemberId.get(row.id);
        if (!item || seen.has(item.id)) return [];
        seen.add(item.id);
        return [item];
      });
      return input.state
        ? ordered.filter((item) => item.phase === input.state)
        : ordered;
    }),
});
