import { type Metadata } from "next";
import { INTL_LOCALE } from "~/i18n/locales";

import { EmptyState } from "~/app/_components/EmptyState";
import {
  PendingGetForm,
  PendingSubmit,
} from "~/app/_components/PendingGetForm";
import { ExhibitionList } from "~/app/_components/ExhibitionList";
import { Section } from "~/app/_components/Section";
import { tripToRowView } from "~/app/_lib/row";
import { hasValidTripRange, parseTripFilters } from "~/app/_lib/trip-filters";
import { datesInRange, todayInHelsinki } from "~/domain/dates";
import { groupRegions } from "~/domain/regions";
import { partitionEndingSoon } from "~/domain/trip";
import { getI18n } from "~/i18n/server";
import { formatWeekdayDate } from "~/i18n/format";
import { SaveTripButton } from "~/app/trip/SaveTripButton";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import type { RouterOutputs } from "~/trpc/react";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: `${t.pages.trip.title} — ${t.app.name}`,
    description: t.pages.meta.trip,
  };
}

export default async function TripPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const i18n = await getI18n();
  const { t, locale } = i18n;
  const filters = parseTripFilters(await searchParams);
  const [regions, museums, session] = await Promise.all([
    api.system.regions(),
    api.museum.list(),
    auth(),
  ]);
  const signedIn = Boolean(session?.user);
  const { cities: cityRegions, others: otherRegions } = groupRegions(
    regions,
    t.regionName,
    INTL_LOCALE[locale],
  );
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
  const tripCities = [
    ...new Set(
      (items ?? [])
        .map((item) => item.museum.city)
        .filter((city): city is string => !!city),
    ),
  ].sort((a, b) => a.localeCompare(b, "fi"));
  const tripDays = range ? datesInRange(range.from, range.to, 31) : [];
  const groups =
    items && range
      ? partitionEndingSoon(items, range.from, range.to, today)
      : null;

  return (
    <>
      <p className="text-muted mb-6 max-w-prose">{t.pages.trip.intro}</p>

      <PendingGetForm className="border-rule-soft mb-8 flex flex-col gap-4 border-b pb-8 font-sans sm:flex-row sm:flex-wrap sm:items-end">
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
                    {t.regionName(region)}
                  </option>
                ))}
              </optgroup>
            )}
            {otherRegions.length > 0 && (
              <optgroup label={t.pages.trip.regions}>
                {otherRegions.map((region) => (
                  <option key={region} value={region}>
                    {t.regionName(region)}
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

        <PendingSubmit className="btn btn-primary">
          {t.pages.trip.submit}
        </PendingSubmit>
      </PendingGetForm>

      {items === null || range === null ? (
        <EmptyState
          className="pb-6"
          message={
            filters.from || filters.to
              ? t.pages.trip.invalidRange
              : t.pages.trip.missingRange
          }
        />
      ) : (
        <>
          <div
            className={`flex flex-col gap-6 ${
              groups && groups.endingSoon.length > 0
                ? ""
                : "border-rule-soft mb-8 border-b pb-8"
            }`}
          >
            {tripCities.length > 0 && (
              <PendingGetForm
                action="/trip/day"
                className="flex flex-col gap-4 font-sans sm:flex-row sm:flex-wrap sm:items-end"
              >
                <h2 className="text-kicker w-full">{t.pages.trip.planDay}</h2>
                {filters.place && (
                  <input type="hidden" name="place" value={filters.place} />
                )}
                <input type="hidden" name="from" value={range.from} />
                <input type="hidden" name="to" value={range.to} />
                <label className="text-kicker flex flex-col gap-1.5 sm:min-w-[12rem]">
                  {t.pages.trip.planDayCity}
                  <select
                    name="city"
                    defaultValue={
                      filters.place && tripCities.includes(filters.place)
                        ? filters.place
                        : tripCities[0]
                    }
                    className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
                  >
                    {tripCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-kicker flex flex-col gap-1.5">
                  {t.pages.trip.planDayDate}
                  <select
                    name="date"
                    className="border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case"
                  >
                    {tripDays.map((day) => (
                      <option key={day} value={day}>
                        {formatWeekdayDate(day, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <PendingSubmit className="btn btn-secondary">
                  {t.pages.trip.planDaySubmit}
                </PendingSubmit>
              </PendingGetForm>
            )}
            {signedIn && (
              <SaveTripButton
                trip={{
                  place: filters.place ?? "",
                  from: range.from,
                  to: range.to,
                }}
              />
            )}
          </div>
          {groups && groups.endingSoon.length > 0 ? (
            <>
              <Section title={t.pages.trip.endingSoon}>
                <ExhibitionList
                  items={groups.endingSoon.map((item) =>
                    tripToRowView(
                      item,
                      today,
                      range.from,
                      range.to,
                      true,
                      i18n,
                    ),
                  )}
                  emptyMessage={t.pages.trip.empty}
                  signedIn={signedIn}
                />
              </Section>
              {groups.rest.length > 0 && (
                <Section title={t.pages.trip.otherOpen}>
                  <ExhibitionList
                    items={groups.rest.map((item) =>
                      tripToRowView(
                        item,
                        today,
                        range.from,
                        range.to,
                        false,
                        i18n,
                      ),
                    )}
                    emptyMessage={t.pages.trip.empty}
                    signedIn={signedIn}
                  />
                </Section>
              )}
            </>
          ) : (
            <ExhibitionList
              items={items.map((item) =>
                tripToRowView(item, today, range.from, range.to, false, i18n),
              )}
              emptyMessage={t.pages.trip.empty}
              signedIn={signedIn}
            />
          )}
        </>
      )}
    </>
  );
}
