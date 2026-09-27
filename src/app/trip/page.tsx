import { type Metadata } from "next";

import { EmptyState } from "~/app/_components/EmptyState";
import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { tripToRowView } from "~/app/_lib/row";
import { hasValidTripRange, parseTripFilters } from "~/app/_lib/trip-filters";
import { todayInHelsinki } from "~/domain/dates";
import { groupRegions } from "~/domain/regions";
import { t } from "~/i18n/fi";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import type { RouterOutputs } from "~/trpc/react";

export const metadata: Metadata = {
  title: `${t.pages.trip.title} — ${t.app.name}`,
  description: t.pages.meta.trip,
};

export default async function TripPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseTripFilters(await searchParams);
  const [regions, museums, session] = await Promise.all([
    api.system.regions(),
    api.museum.list(),
    auth(),
  ]);
  const signedIn = Boolean(session?.user);
  const { cities: cityRegions, others: otherRegions } = groupRegions(regions);
  const freeCities = [
    ...new Set(
      museums
        .map((museum) => museum.city)
        .filter(
          (city): city is string => !!city && !cityRegions.includes(city),
        ),
    ),
  ].sort((a, b) => a.localeCompare(b, "fi"));

  let items: RouterOutputs["trip"]["list"] | null = null;
  let range: { from: string; to: string } | null = null;
  if (hasValidTripRange(filters)) {
    range = { from: filters.from, to: filters.to };
    items = await api.trip.list({
      place: filters.place ?? undefined,
      ...range,
    });
  }
  const today = todayInHelsinki();

  return (
    <div className="py-8">
      <h1 className="text-headline mb-2 text-4xl sm:text-5xl">
        {t.pages.trip.title}
      </h1>
      <p className="text-muted mb-6 max-w-prose">{t.pages.trip.intro}</p>

      <form
        method="get"
        className="border-rule-soft mb-8 flex flex-col gap-4 border-b pb-8 font-sans sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="text-kicker flex flex-col gap-1.5 sm:min-w-[12rem] sm:flex-1">
          {t.pages.trip.place}
          <select
            name="place"
            defaultValue={filters.place ?? ""}
            className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
          >
            <option value="">{t.pages.trip.allPlaces}</option>
            {cityRegions.length > 0 && (
              <optgroup label={t.pages.trip.cityRegions}>
                {cityRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </optgroup>
            )}
            {otherRegions.length > 0 && (
              <optgroup label={t.pages.trip.regions}>
                {otherRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </optgroup>
            )}
            {freeCities.length > 0 && (
              <optgroup label={t.pages.trip.otherCities}>
                {freeCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <label className="text-kicker flex flex-col gap-1.5">
          {t.pages.trip.from}
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
          />
        </label>

        <label className="text-kicker flex flex-col gap-1.5">
          {t.pages.trip.to}
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
          />
        </label>

        <button type="submit" className="btn btn-primary">
          {t.pages.trip.submit}
        </button>
      </form>

      {items === null || range === null ? (
        <EmptyState
          message={
            filters.from || filters.to
              ? t.pages.trip.invalidRange
              : t.pages.trip.missingRange
          }
        />
      ) : (
        <ExhibitionList
          items={items.map((item) =>
            tripToRowView(item, today, range.from, range.to),
          )}
          emptyMessage={t.pages.trip.empty}
          signedIn={signedIn}
        />
      )}
    </div>
  );
}
