import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { todayInHelsinki } from "~/domain/dates";
import { learnAffinity, type RatedVisit } from "~/domain/learned-affinity";
import { getRelevance, type RelevanceReason } from "~/domain/relevance";
import { getSinulleScore, isSinulleEligible } from "~/domain/ranking";
import { getUrgency } from "~/domain/urgency";
import { localized } from "~/domain/localized";
import { i18nFor, type Messages } from "~/i18n";
import { LOCALES } from "~/i18n/locales";
import { groupExhibitionRows } from "~/server/api/grouping";
import { categoryRouter } from "~/server/api/routers/category";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getActiveExhibitionPool } from "~/server/cache/active-pool";
import {
  exhibitionCategories,
  exhibitions,
  importRuns,
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
    t: Messages;
  },
): string | null {
  switch (reason.type) {
    case "category": {
      const name = context.categoryNameById.get(reason.categoryId);
      if (name === undefined) return null;
      return reason.weight === 2 ? `${name} ★` : name;
    }
    case "region":
      return context.region && context.t.regionName(context.region);
    case "museum":
      return context.t.pages.home.whyFollowed(context.museumName);
    case "new":
      return context.t.pages.home.whyNew;
    case "learned":
      if (reason.points <= 0) return null;
      return reason.basis === "museum"
        ? context.t.pages.home.whyLikedMuseum(context.museumName)
        : context.t.pages.home.whyLikedSimilar;
  }
}

export const recommendationRouter = createTRPCRouter({
  forYou: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
          locale: z.enum(LOCALES).default("fi"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [
        interests,
        regions,
        followed,
        states,
        secondSucceededImport,
        pool,
        allCategories,
        ratingRows,
      ] = await Promise.all([
        ctx.db
          .select({
            categoryId: userInterests.categoryId,
            weight: userInterests.weight,
          })
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
          .select({ id: importRuns.id })
          .from(importRuns)
          .where(eq(importRuns.status, "succeeded"))
          .limit(1)
          .offset(1),
        getActiveExhibitionPool(ctx.db),
        categoryRouter.createCaller(ctx).list(),
        ctx.db
          .select({
            exhibitionId: userExhibitions.exhibitionId,
            rating: userExhibitions.rating,
            visitedAt: userExhibitions.visitedAt,
            museumId: exhibitions.museumId,
            categoryId: exhibitionCategories.categoryId,
          })
          .from(userExhibitions)
          .innerJoin(
            exhibitions,
            eq(exhibitions.id, userExhibitions.exhibitionId),
          )
          .leftJoin(
            exhibitionCategories,
            eq(exhibitionCategories.exhibitionId, userExhibitions.exhibitionId),
          )
          .where(
            and(
              eq(userExhibitions.userId, userId),
              eq(userExhibitions.status, "visited"),
              isNotNull(userExhibitions.rating),
            ),
          ),
      ]);
      // Sinulle follows the masthead region choice; none chosen means all of Finland.
      const chosenRegions = new Set(regions.map((row) => row.region));
      const rows = pool
        .filter(
          ({ museum }) =>
            chosenRegions.size === 0 ||
            (museum.region !== null && chosenRegions.has(museum.region)),
        )
        .map(({ exhibition, museum }) => ({ exhibition, museum }));
      const categoryIdsByExhibition = new Map(
        pool.map((entry) => [entry.exhibition.id, entry.categoryIds]),
      );
      const locale = input?.locale ?? "fi";
      const { t } = i18nFor(locale);
      const categoryNameById = new Map(
        allCategories.map((category) => [
          category.id,
          localized(category, "name", locale).text,
        ]),
      );
      const interestWeights = new Map<number, 1 | 2>();
      const excludedCategoryIds = new Set<number>();
      for (const interest of interests) {
        if (interest.weight === -1)
          excludedCategoryIds.add(interest.categoryId);
        else interestWeights.set(interest.categoryId, interest.weight as 1 | 2);
      }
      const ratedVisits = new Map<
        number,
        RatedVisit & { categoryIds: number[] }
      >();
      for (const row of ratingRows) {
        if (row.rating === null) continue;
        const visit = ratedVisits.get(row.exhibitionId) ?? {
          categoryIds: [],
          museumId: row.museumId,
          rating: row.rating,
          visitedAt: row.visitedAt?.toISOString().slice(0, 10) ?? null,
        };
        if (row.categoryId !== null) visit.categoryIds.push(row.categoryId);
        ratedVisits.set(row.exhibitionId, visit);
      }
      const today = todayInHelsinki();
      const preferences = {
        interestWeights,
        excludedCategoryIds,
        preferredRegions: new Set(regions.map((x) => x.region)),
        followedMuseumIds: new Set(followed.map((x) => x.id)),
        learnedAffinity: learnAffinity([...ratedVisits.values()], today),
      };
      const hasMultipleImports = secondSucceededImport.length > 0;
      const groups = groupExhibitionRows(rows);
      return groups
        .flatMap(({ exhibition, museum, venues, memberIds }) => {
          const relevance = getRelevance(
            {
              categoryIds: categoryIdsByExhibition.get(exhibition.id) ?? [],
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
            states.find((x) => memberIds.includes(x.id))?.status ?? null;
          if (
            !isSinulleEligible({
              relevance,
              status,
              hasInterests: interestWeights.size > 0,
            })
          )
            return [];
          const urgency = getUrgency(exhibition, today);
          const reasons = relevance.reasons
            .map((reason) =>
              reasonLabel(reason, {
                categoryNameById,
                region: museum.region,
                museumName: localized(museum, "name", locale).text,
                t,
              }),
            )
            .filter((label): label is string => label !== null);
          return [
            {
              exhibition,
              museum,
              venues,
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
