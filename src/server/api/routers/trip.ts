import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";

import { todayInHelsinki } from "~/domain/dates";
import { getRelevance, type UserPreferences } from "~/domain/relevance";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { whereVisible, withDetails } from "~/server/api/routers/exhibition";
import {
  exhibitions,
  museums,
  userFollowedMuseums,
  userInterests,
  userRegions,
} from "~/server/db/schema";
import type { Db } from "~/server/db";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const listInput = z
  .object({
    place: z.string().min(1).optional(),
    from: isoDate,
    to: isoDate,
  })
  .refine((range) => range.from <= range.to, {
    message: "to must not be before from",
    path: ["to"],
  });

async function loadPreferences(
  db: Db,
  userId: string,
): Promise<UserPreferences> {
  const [interests, regions, followed] = await Promise.all([
    db
      .select({
        categoryId: userInterests.categoryId,
        weight: userInterests.weight,
      })
      .from(userInterests)
      .where(eq(userInterests.userId, userId)),
    db
      .select({ region: userRegions.region })
      .from(userRegions)
      .where(eq(userRegions.userId, userId)),
    db
      .select({ id: userFollowedMuseums.museumId })
      .from(userFollowedMuseums)
      .where(eq(userFollowedMuseums.userId, userId)),
  ]);
  const interestWeights = new Map<number, 1 | 2>();
  const excludedCategoryIds = new Set<number>();
  for (const interest of interests) {
    if (interest.weight === -1) excludedCategoryIds.add(interest.categoryId);
    else interestWeights.set(interest.categoryId, interest.weight as 1 | 2);
  }
  return {
    interestWeights,
    excludedCategoryIds,
    preferredRegions: new Set(regions.map((row) => row.region)),
    followedMuseumIds: new Set(followed.map((row) => row.id)),
  };
}

/**
 * Exhibitions open at some point during `[from, to]` at the given place
 * (a region or a city — resolved by matching either column). No relevance
 * filtering, unlike Sinulle: a trip should show everything that's open, only
 * ordered by relevance for a signed-in user, then by closing date.
 */
export const tripRouter = createTRPCRouter({
  list: publicProcedure.input(listInput).query(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id ?? null;
    const filters = [
      eq(exhibitions.kind, "exhibition"),
      whereVisible(userId),
      lte(exhibitions.startDate, input.to),
      or(isNull(exhibitions.endDate), gte(exhibitions.endDate, input.from)),
    ];
    if (input.place)
      filters.push(
        or(eq(museums.region, input.place), eq(museums.city, input.place)),
      );

    const rows = await ctx.db
      .select({ exhibition: exhibitions, museum: museums })
      .from(exhibitions)
      .innerJoin(museums, eq(exhibitions.museumId, museums.id))
      .where(and(...filters));
    const items = await withDetails(ctx.db, rows, userId);

    const preferences = userId ? await loadPreferences(ctx.db, userId) : null;
    const today = todayInHelsinki();
    return items
      .map((item) => ({
        item,
        score: preferences
          ? getRelevance(
              {
                categoryIds: item.categories.map((category) => category.id),
                region: item.museum.region,
                museumId: item.museum.id,
                firstSeenAt: null,
              },
              preferences,
              today,
            ).score
          : 0,
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.item.endDate ?? "9999-12-31").localeCompare(
            b.item.endDate ?? "9999-12-31",
          ) ||
          a.item.id - b.item.id,
      )
      .map(({ item }) => item);
  }),
});
