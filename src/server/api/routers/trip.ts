import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { todayInHelsinki } from "~/domain/dates";
import { MAX_DAY_STOPS } from "~/domain/day-plan";
import { getRelevance, type UserPreferences } from "~/domain/relevance";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  loadHiddenMatcher,
  withDetails,
} from "~/server/api/routers/exhibition";
import { getActiveExhibitionPool } from "~/server/cache/active-pool";
import {
  exhibitions,
  museums,
  savedTrips,
  userExhibitions,
  userFollowedMuseums,
  userInterests,
  userRegions,
} from "~/server/db/schema";
import type { Db } from "~/server/db";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const MAX_SAVED_TRIPS = 50;
const MAX_SAVED_DAYS = 31;

const dayPlanInput = z.object({
  city: z.string().min(1),
  date: isoDate,
  exhibitionIds: z.array(z.number().int().positive()).min(1).max(MAX_DAY_STOPS),
  start: timeOfDay,
});

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
 * `list`: exhibitions open at some point during `[from, to]` at the given
 * place (a region or a city — resolved by matching either column). No
 * relevance filtering, unlike Sinulle: a trip should show everything that's
 * open, only ordered by relevance for a signed-in user, then by closing date.
 * Both `list` and `day` read the cached active pool, so exhibitions that
 * ended before today are left out even when a range starts in the past.
 */
export const tripRouter = createTRPCRouter({
  list: publicProcedure.input(listInput).query(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id ?? null;
    const [pool, isHidden] = await Promise.all([
      getActiveExhibitionPool(ctx.db),
      loadHiddenMatcher(ctx.db, userId),
    ]);
    const matches = pool.filter(
      ({ exhibition, museum }) =>
        !isHidden(exhibition) &&
        exhibition.startDate <= input.to &&
        (exhibition.endDate ?? "9999-12-31") >= input.from &&
        (!input.place ||
          museum.region === input.place ||
          museum.city === input.place),
    );
    const items = await withDetails(
      ctx.db,
      matches,
      userId,
      new Map(matches.map((entry) => [entry.exhibition.id, entry.categoryIds])),
    );

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

  /**
   * Exhibitions open on `date` in `city`, one row per venue: a touring
   * exhibition at two museums in the same city is two possible stops.
   */
  day: publicProcedure
    .input(z.object({ city: z.string().min(1), date: isoDate }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      const [pool, isHidden] = await Promise.all([
        getActiveExhibitionPool(ctx.db),
        loadHiddenMatcher(ctx.db, userId),
      ]);
      const rows = pool.filter(
        ({ exhibition, museum }) =>
          !isHidden(exhibition) &&
          museum.city === input.city &&
          exhibition.startDate <= input.date &&
          (exhibition.endDate ?? "9999-12-31") >= input.date,
      );

      const interested = userId
        ? await ctx.db
            .select({
              id: exhibitions.id,
              group: exhibitions.exhibitionGroup,
            })
            .from(userExhibitions)
            .innerJoin(
              exhibitions,
              eq(exhibitions.id, userExhibitions.exhibitionId),
            )
            .where(
              and(
                eq(userExhibitions.userId, userId),
                eq(userExhibitions.status, "interested"),
              ),
            )
        : [];
      const interestedIds = new Set(interested.map((row) => row.id));
      const interestedGroups = new Set(
        interested.map((row) => row.group).filter((group) => group !== null),
      );

      return rows
        .map(({ exhibition, museum }) => ({
          id: exhibition.id,
          slug: exhibition.slug,
          title: exhibition.titleFi,
          startDate: exhibition.startDate,
          endDate: exhibition.endDate,
          museumName: museum.name,
          museumSlug: museum.slug,
          address: museum.address,
          latitude: museum.latitude,
          longitude: museum.longitude,
          openingHours: museum.openingHours?.days ?? null,
          interested:
            interestedIds.has(exhibition.id) ||
            (exhibition.exhibitionGroup !== null &&
              interestedGroups.has(exhibition.exhibitionGroup)),
        }))
        .sort(
          (a, b) =>
            Number(b.interested) - Number(a.interested) ||
            a.museumName.localeCompare(b.museumName, "fi") ||
            a.title.localeCompare(b.title, "fi"),
        );
    }),

  saved: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(savedTrips)
      .where(eq(savedTrips.userId, ctx.session.user.id))
      .orderBy(desc(savedTrips.fromDate), desc(savedTrips.id)),
  ),

  /**
   * Saves the trip (keyed by place and dates), merging in `day` when given:
   * a later plan for the same city and date replaces the earlier one.
   */
  save: protectedProcedure
    .input(
      z
        .object({
          place: z.string().max(200).default(""),
          from: isoDate,
          to: isoDate,
          day: dayPlanInput.optional(),
        })
        .refine((trip) => trip.from <= trip.to, { path: ["to"] })
        .refine(
          (trip) =>
            !trip.day ||
            (trip.day.date >= trip.from && trip.day.date <= trip.to),
          { path: ["day", "date"] },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existingTrips = await ctx.db
        .select()
        .from(savedTrips)
        .where(eq(savedTrips.userId, userId));
      const existing = existingTrips.find(
        (trip) =>
          trip.place === input.place &&
          trip.fromDate === input.from &&
          trip.toDate === input.to,
      );
      if (!existing && existingTrips.length >= MAX_SAVED_TRIPS)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Too many trips" });

      const days = (existing?.days ?? []).filter(
        (day) => day.date !== input.day?.date || day.city !== input.day.city,
      );
      if (input.day) days.push(input.day);
      days.sort((a, b) => a.date.localeCompare(b.date));
      if (days.length > MAX_SAVED_DAYS)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Too many days" });
      const exhibitionIds = [
        ...new Set(days.flatMap((day) => day.exhibitionIds)),
      ];

      const [trip] = await ctx.db
        .insert(savedTrips)
        .values({
          userId,
          place: input.place,
          fromDate: input.from,
          toDate: input.to,
          exhibitionIds,
          days,
        })
        .onConflictDoUpdate({
          target: [
            savedTrips.userId,
            savedTrips.place,
            savedTrips.fromDate,
            savedTrips.toDate,
          ],
          set: { exhibitionIds, days, updatedAt: new Date() },
        })
        .returning({ id: savedTrips.id });
      return trip!;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(savedTrips)
        .where(
          and(
            eq(savedTrips.id, input.id),
            eq(savedTrips.userId, ctx.session.user.id),
          ),
        );
    }),
});

/** Stops for a day plan, in the requested order; ids that aren't open exhibitions in that city are dropped. */
export async function loadDayStops(
  db: Db,
  city: string,
  ids: readonly number[],
) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ exhibition: exhibitions, museum: museums })
    .from(exhibitions)
    .innerJoin(museums, eq(exhibitions.museumId, museums.id))
    .where(and(inArray(exhibitions.id, [...ids]), eq(museums.city, city)));
  return ids.flatMap((id) => rows.filter((row) => row.exhibition.id === id));
}
