import { and, count, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { withDetails } from "~/server/api/routers/exhibition";
import { userExhibitionRouter } from "~/server/api/routers/user-exhibition";
import { todayInHelsinki } from "~/domain/dates";
import { exhibitions, userExhibitions } from "~/server/db/schema";

const ENDING_SOON_WITHIN_DAYS = 7;

export const myRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ status: z.enum(["interested", "visited", "hidden"]) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const statusRows = await userExhibitionRouter
        .createCaller(ctx)
        .listByStatus(input);
      if (!statusRows.length) return [];
      const items = await withDetails(
        ctx.db,
        statusRows.map(({ exhibition, museum }) => ({ exhibition, museum })),
        userId,
      );
      const itemByMemberId = new Map(
        items.flatMap((item) =>
          item.memberIds.map((id) => [id, item] as const),
        ),
      );
      // Two group members can each carry the user's status; keep the first
      // (by `listByStatus`'s ordering) and resolve both to the canonical one.
      const seen = new Set<number>();
      return statusRows.flatMap((row) => {
        const item = itemByMemberId.get(row.exhibitionId);
        if (!item || seen.has(item.id)) return [];
        seen.add(item.id);
        return [
          {
            ...item,
            visitedAt: row.visitedAt,
            visitNote: row.note,
            visitedCardEligible: row.exhibition.museumCardEligible,
            visitedAdmissionAdultCents: row.exhibition.admissionAdultCents,
          },
        ];
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
