import { z } from "zod";

import { getPhase, todayInHelsinki } from "~/domain/dates";
import { haversineKm, type Coordinates } from "~/domain/day-plan";
import { MAX_NEARBY_RADIUS_KM, roundCoordinates } from "~/domain/nearby";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getActiveExhibitionPool } from "~/server/cache/active-pool";
import { loadHiddenMatcher } from "./exhibition";
import { listMuseums } from "./museum";

type Museum = Awaited<ReturnType<typeof listMuseums>>[number];

function located(museum: Museum): Coordinates | null {
  return museum.latitude !== null && museum.longitude !== null
    ? { latitude: museum.latitude, longitude: museum.longitude }
    : null;
}

/** The mean of the city's located museums: a stand-in origin when the browser location isn't available. */
function cityCentres(museums: readonly Museum[]) {
  const byCity = new Map<
    string,
    {
      region: string | null;
      latitude: number;
      longitude: number;
      count: number;
    }
  >();
  for (const museum of museums) {
    const coordinates = located(museum);
    if (!museum.city || !coordinates) continue;
    const entry = byCity.get(museum.city) ?? {
      region: museum.region,
      latitude: 0,
      longitude: 0,
      count: 0,
    };
    entry.latitude += coordinates.latitude;
    entry.longitude += coordinates.longitude;
    entry.count += 1;
    byCity.set(museum.city, entry);
  }
  return new Map(
    [...byCity].map(([city, entry]) => [
      city,
      {
        region: entry.region,
        latitude: entry.latitude / entry.count,
        longitude: entry.longitude / entry.count,
      },
    ]),
  );
}

const originInput = z.union([
  z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  z.object({ city: z.string().min(1).max(100) }),
]);

export const nearbyRouter = createTRPCRouter({
  cities: publicProcedure.query(async ({ ctx }) =>
    [...cityCentres(await listMuseums(ctx.db))].map(([city, { region }]) => ({
      city,
      region,
    })),
  ),

  /**
   * A mutation so the coordinates travel in the POST body: GET queries carry
   * their input in the URL, which request logs record.
   */
  museums: publicProcedure
    .input(originInput)
    .mutation(async ({ ctx, input }) => {
      const museums = await listMuseums(ctx.db);
      const origin =
        "city" in input
          ? cityCentres(museums).get(input.city)
          : roundCoordinates(input);
      if (!origin) return { origin: null, museums: [] };

      const nearbyMuseums = museums.flatMap((museum) => {
        const coordinates = located(museum);
        return coordinates &&
          haversineKm(origin, coordinates) <= MAX_NEARBY_RADIUS_KM
          ? [{ museum, coordinates }]
          : [];
      });
      const ids = new Set(nearbyMuseums.map(({ museum }) => museum.id));
      const [pool, isHidden] = await Promise.all([
        getActiveExhibitionPool(ctx.db),
        loadHiddenMatcher(ctx.db, ctx.session?.user?.id ?? null),
      ]);
      const today = todayInHelsinki();
      const exhibitionsByMuseum = new Map<number, typeof pool>();
      for (const entry of pool) {
        if (!ids.has(entry.museum.id) || isHidden(entry.exhibition)) continue;
        // Upcoming ones stay in, so a browser whose date is ahead still sees an exhibition that opens today.
        if (getPhase(entry.exhibition, today) === "ended") continue;
        const list = exhibitionsByMuseum.get(entry.museum.id) ?? [];
        list.push(entry);
        exhibitionsByMuseum.set(entry.museum.id, list);
      }

      return {
        origin: "city" in input ? origin : null,
        museums: nearbyMuseums.map(({ museum, coordinates }) => ({
          id: museum.id,
          slug: museum.slug,
          name: museum.name,
          nameEn: museum.nameEn,
          nameSv: museum.nameSv,
          city: museum.city,
          address: museum.address,
          coordinates,
          openingHours: museum.openingHours?.days ?? null,
          exhibitions: (exhibitionsByMuseum.get(museum.id) ?? [])
            .map(({ exhibition }) => ({
              id: exhibition.id,
              slug: exhibition.slug,
              titleFi: exhibition.titleFi,
              titleEn: exhibition.titleEn,
              titleSv: exhibition.titleSv,
              startDate: exhibition.startDate,
              endDate: exhibition.endDate,
            }))
            .sort((a, b) =>
              (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999"),
            ),
        })),
      };
    }),
});
