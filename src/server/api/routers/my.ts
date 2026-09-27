import { and, count, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { exhibitionRouter } from "~/server/api/routers/exhibition";
import { userExhibitionRouter } from "~/server/api/routers/user-exhibition";
import { todayInHelsinki } from "~/domain/dates";
import { exhibitions, userExhibitions } from "~/server/db/schema";

const ENDING_SOON_WITHIN_DAYS = 7;

/**
 * `userExhibition.listByStatus` returns bare exhibition rows (no museum join
 * or categories); composes it with `exhibition.bySlug` for the museum,
 * categories and phase/urgency the My pages need, the same
 * call-a-sibling-router pattern `museum.exhibitions` already uses.
 */
export const myRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ status: z.enum(["interested", "visited", "hidden"]) }))
    .query(async ({ ctx, input }) => {
      const rows = await userExhibitionRouter
        .createCaller(ctx)
        .listByStatus(input);
      const items = await Promise.all(
        rows.map(async (row) => {
          const item = await exhibitionRouter
            .createCaller(ctx)
            .bySlug({ slug: row.exhibition.slug });
          return item
            ? { ...item, visitedAt: row.visitedAt, visitNote: row.note }
            : null;
        }),
      );
      const found = items.filter(
        (item): item is NonNullable<typeof item> => item !== null,
      );
      // Two group members can each carry the user's status; bySlug then
      // resolves both to the same canonical exhibition.
      const seenSlugs = new Set<string>();
      return found.filter((item) => {
        if (seenSlugs.has(item.slug)) return false;
        seenSlugs.add(item.slug);
        return true;
      });
    }),
  /** Drives the Omat tab dot: interested exhibitions ending within a week. */
  endingSoonCount: protectedProcedure.query(async ({ ctx }) => {
    const today = todayInHelsinki();
    const until = new Date(`${today}T00:00:00Z`);
    until.setUTCDate(until.getUTCDate() + ENDING_SOON_WITHIN_DAYS);
    const [row] = await ctx.db
      .select({ count: count() })
      .from(userExhibitions)
      .innerJoin(exhibitions, eq(exhibitions.id, userExhibitions.exhibitionId))
      .where(
        and(
          eq(userExhibitions.userId, ctx.session.user.id),
          eq(userExhibitions.status, "interested"),
          gte(exhibitions.endDate, today),
          lte(exhibitions.endDate, until.toISOString().slice(0, 10)),
        ),
      );
    return row?.count ?? 0;
  }),
});
