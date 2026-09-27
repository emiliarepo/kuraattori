import { and, count, eq, gte, lte, min, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { withDetails } from "~/server/api/routers/exhibition";
import { todayInHelsinki } from "~/domain/dates";
import { MY_SORTS, type MySort } from "~/domain/my-sort";
import { exhibitions, museums, userExhibitions } from "~/server/db/schema";

const ENDING_SOON_WITHIN_DAYS = 7;
const sortInput = z
  .object({
    status: z.enum(["interested", "visited", "hidden"]),
    sort: z
      .enum([
        "ending",
        "added",
        "opening",
        "name",
        "visited-newest",
        "visited-oldest",
        "hidden-newest",
      ])
      .optional(),
  })
  .refine(
    ({ status, sort }) =>
      !sort || (MY_SORTS[status] as readonly string[]).includes(sort),
  );

const collator = new Intl.Collator("fi-FI");

function compareDates(a: Date | null, b: Date | null, descending = false) {
  const difference = (a?.getTime() ?? 0) - (b?.getTime() ?? 0);
  return descending ? -difference : difference;
}

export const myRouter = createTRPCRouter({
  list: protectedProcedure.input(sortInput).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const statusRows = await ctx.db
      .select({
        exhibitionId: userExhibitions.exhibitionId,
        visitedAt: userExhibitions.visitedAt,
        note: userExhibitions.note,
        createdAt: userExhibitions.createdAt,
        updatedAt: userExhibitions.updatedAt,
        exhibition: exhibitions,
        museum: museums,
      })
      .from(userExhibitions)
      .innerJoin(exhibitions, eq(exhibitions.id, userExhibitions.exhibitionId))
      .innerJoin(museums, eq(museums.id, exhibitions.museumId))
      .where(
        and(
          eq(userExhibitions.userId, userId),
          eq(userExhibitions.status, input.status),
        ),
      );
    if (!statusRows.length) return [];
    const items = await withDetails(
      ctx.db,
      statusRows.map(({ exhibition, museum }) => ({ exhibition, museum })),
      userId,
    );
    const itemByMemberId = new Map(
      items.flatMap((item) => item.memberIds.map((id) => [id, item] as const)),
    );
    const sort: MySort = input.sort ?? MY_SORTS[input.status][0];
    statusRows.sort((a, b) => {
      let order = 0;
      if (input.status === "visited")
        order = compareDates(
          a.visitedAt,
          b.visitedAt,
          sort !== "visited-oldest",
        );
      else if (sort === "added")
        order = compareDates(a.createdAt, b.createdAt, true);
      else if (input.status === "hidden")
        order = compareDates(
          a.updatedAt ?? a.createdAt,
          b.updatedAt ?? b.createdAt,
          true,
        );
      return order || a.exhibitionId - b.exhibitionId;
    });
    const seen = new Set<number>();
    const sorted = statusRows.flatMap((row) => {
      const item = itemByMemberId.get(row.exhibitionId);
      if (!item || seen.has(item.id)) return [];
      seen.add(item.id);
      return [
        {
          ...item,
          visitedAt: row.visitedAt,
          visitNote: row.note,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          visitedCardEligible: row.exhibition.museumCardEligible,
          visitedAdmissionAdultCents: row.exhibition.admissionAdultCents,
        },
      ];
    });
    const today = todayInHelsinki();
    sorted.sort((a, b) => {
      let order = 0;
      switch (sort) {
        case "ending": {
          const aEnded = a.endDate !== null && a.endDate < today;
          const bEnded = b.endDate !== null && b.endDate < today;
          order =
            Number(aEnded) - Number(bEnded) ||
            (a.endDate ?? "9999-12-31").localeCompare(
              b.endDate ?? "9999-12-31",
            );
          break;
        }
        case "added":
          order = compareDates(a.createdAt, b.createdAt, true);
          break;
        case "opening":
          order =
            Number(a.startDate <= today) - Number(b.startDate <= today) ||
            a.startDate.localeCompare(b.startDate);
          break;
        case "name":
          order = collator.compare(a.titleFi, b.titleFi);
          break;
        case "visited-newest":
          order = compareDates(a.visitedAt, b.visitedAt, true);
          break;
        case "visited-oldest":
          order = compareDates(a.visitedAt, b.visitedAt);
          break;
        case "hidden-newest":
          order = compareDates(
            a.updatedAt ?? a.createdAt,
            b.updatedAt ?? b.createdAt,
            true,
          );
          break;
      }
      return order || a.id - b.id;
    });
    return sorted;
  }),
  /** First visit per museum: the Museopassi stamps. */
  stamps: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        museumId: exhibitions.museumId,
        firstVisitedAt: min(
          sql<number>`coalesce(${userExhibitions.visitedAt}, ${userExhibitions.updatedAt}, ${userExhibitions.createdAt})`,
        ),
      })
      .from(userExhibitions)
      .innerJoin(exhibitions, eq(exhibitions.id, userExhibitions.exhibitionId))
      .where(
        and(
          eq(userExhibitions.userId, ctx.session.user.id),
          eq(userExhibitions.status, "visited"),
        ),
      )
      .groupBy(exhibitions.museumId);
    return new Map(
      rows.map((row) => [
        row.museumId,
        new Date(Number(row.firstVisitedAt) * 1000),
      ]),
    );
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
