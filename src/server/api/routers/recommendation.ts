import { asc, count, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { todayInHelsinki } from "~/domain/dates";
import { getRelevance, type RelevanceReason } from "~/domain/relevance";
import { getSinulleScore, isSinulleEligible } from "~/domain/ranking";
import { getUrgency } from "~/domain/urgency";
import { t } from "~/i18n/fi";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  categories,
  exhibitionCategories,
  exhibitions,
  importRuns,
  museums,
  userExhibitions,
  userFollowedMuseums,
  userInterests,
  userRegions,
} from "~/server/db/schema";

function reasonLabel(
  reason: RelevanceReason,
  context: {
    categoryNameById: ReadonlyMap<number, string>;
    region: string | null;
    museumName: string;
  },
): string | null {
  switch (reason.type) {
    case "category":
      return context.categoryNameById.get(reason.categoryId) ?? null;
    case "region":
      return context.region;
    case "museum":
      return context.museumName;
    case "new":
      return t.pages.home.whyNew;
  }
}

export const recommendationRouter = createTRPCRouter({
  forYou: protectedProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(50).default(20) })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [interests, regions, followed, states, rows, importRunCount] =
        await Promise.all([
          ctx.db
            .select({ id: userInterests.categoryId })
            .from(userInterests)
            .where(eq(userInterests.userId, userId)),
          ctx.db
            .select({ region: userRegions.region })
            .from(userRegions)
            .where(eq(userRegions.userId, userId)),
          ctx.db
            .select({ id: userFollowedMuseums.museumId })
            .from(userFollowedMuseums)
            .where(eq(userFollowedMuseums.userId, userId)),
          ctx.db
            .select({
              id: userExhibitions.exhibitionId,
              status: userExhibitions.status,
            })
            .from(userExhibitions)
            .where(eq(userExhibitions.userId, userId)),
          ctx.db
            .select({ exhibition: exhibitions, museum: museums })
            .from(exhibitions)
            .innerJoin(museums, eq(exhibitions.museumId, museums.id))
            .where(
              or(
                sql`${exhibitions.endDate} is null`,
                sql`${exhibitions.endDate} >= ${todayInHelsinki()}`,
              ),
            )
            .orderBy(asc(exhibitions.startDate))
            .limit(500),
          ctx.db
            .select({ count: count() })
            .from(importRuns)
            .where(eq(importRuns.status, "succeeded")),
        ]);
      const categoryRows: { exhibitionId: number; categoryId: number }[] = [];
      const categoryNameById = new Map<number, string>();
      for (let offset = 0; offset < rows.length; offset += 90) {
        const batch = rows.slice(offset, offset + 90);
        const batchRows = await ctx.db
          .select({
            exhibitionId: exhibitionCategories.exhibitionId,
            categoryId: exhibitionCategories.categoryId,
            name: categories.name,
          })
          .from(exhibitionCategories)
          .innerJoin(
            categories,
            eq(categories.id, exhibitionCategories.categoryId),
          )
          .where(
            inArray(
              exhibitionCategories.exhibitionId,
              batch.map((row) => row.exhibition.id),
            ),
          );
        for (const row of batchRows) {
          categoryRows.push(row);
          categoryNameById.set(row.categoryId, row.name);
        }
      }
      const preferences = {
        interestCategoryIds: new Set(interests.map((x) => x.id)),
        preferredRegions: new Set(regions.map((x) => x.region)),
        followedMuseumIds: new Set(followed.map((x) => x.id)),
      };
      const today = todayInHelsinki();
      const hasMultipleImports = (importRunCount[0]?.count ?? 0) > 1;
      return rows
        .flatMap(({ exhibition, museum }) => {
          const relevance = getRelevance(
            {
              categoryIds: categoryRows
                .filter((x) => x.exhibitionId === exhibition.id)
                .map((x) => x.categoryId),
              region: museum.region,
              museumId: museum.id,
              firstSeenAt: hasMultipleImports
                ? exhibition.createdAt.toISOString().slice(0, 10)
                : null,
            },
            preferences,
            today,
          );
          const status =
            states.find((x) => x.id === exhibition.id)?.status ?? null;
          if (
            !isSinulleEligible({
              relevance,
              status,
              hasInterests: interests.length > 0,
            })
          )
            return [];
          const urgency = getUrgency(exhibition, today);
          const reasons = relevance.reasons
            .map((reason) =>
              reasonLabel(reason, {
                categoryNameById,
                region: museum.region,
                museumName: museum.name,
              }),
            )
            .filter((label): label is string => label !== null);
          return [
            {
              exhibition,
              museum,
              relevance,
              reasons,
              urgency,
              score: getSinulleScore({ relevance, urgency }),
            },
          ];
        })
        .sort((a, b) => b.score - a.score || a.exhibition.id - b.exhibition.id)
        .slice(0, input?.limit ?? 20);
    }),
});
