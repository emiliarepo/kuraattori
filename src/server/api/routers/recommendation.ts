import { asc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { todayInHelsinki } from "~/domain/dates";
import { getRelevance } from "~/domain/relevance";
import { getSinulleScore, isSinulleEligible } from "~/domain/ranking";
import { getUrgency } from "~/domain/urgency";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  categories,
  exhibitionCategories,
  exhibitions,
  museums,
  userExhibitions,
  userFollowedMuseums,
  userInterests,
  userRegions,
} from "~/server/db/schema";

export const recommendationRouter = createTRPCRouter({
  forYou: protectedProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(50).default(20) })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [interests, regions, followed, states, rows] = await Promise.all([
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
      ]);
      const categoryRows: { exhibitionId: number; categoryId: number }[] = [];
      for (let offset = 0; offset < rows.length; offset += 90) {
        const batch = rows.slice(offset, offset + 90);
        categoryRows.push(
          ...(await ctx.db
            .select({
              exhibitionId: exhibitionCategories.exhibitionId,
              categoryId: exhibitionCategories.categoryId,
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
            )),
        );
      }
      const preferences = {
        interestCategoryIds: new Set(interests.map((x) => x.id)),
        preferredRegions: new Set(regions.map((x) => x.region)),
        followedMuseumIds: new Set(followed.map((x) => x.id)),
      };
      const today = todayInHelsinki();
      return rows
        .flatMap(({ exhibition, museum }) => {
          const relevance = getRelevance(
            {
              categoryIds: categoryRows
                .filter((x) => x.exhibitionId === exhibition.id)
                .map((x) => x.categoryId),
              region: museum.region,
              museumId: museum.id,
              firstSeenAt: exhibition.createdAt.toISOString().slice(0, 10),
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
          return [
            {
              exhibition,
              museum,
              relevance,
              urgency,
              score: getSinulleScore({ relevance, urgency }),
            },
          ];
        })
        .sort((a, b) => b.score - a.score || a.exhibition.id - b.exhibition.id)
        .slice(0, input?.limit ?? 20);
    }),
});
