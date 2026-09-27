import { type Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "~/app/_components/EmptyState";
import { UrgencyLabel } from "~/app/_components/UrgencyLabel";
import {
  dayPlanHref,
  DEFAULT_START,
  parseDayPlan,
  type DayPlanParams,
} from "~/app/_lib/day-plan-params";
import { urgencyLabelText } from "~/app/_lib/exhibition-format";
import { SaveTripButton } from "~/app/trip/SaveTripButton";
import { RouteLink } from "~/app/trip/day/RouteLink";
import { todayInHelsinki } from "~/domain/dates";
import {
  MAX_DAY_STOPS,
  MIN_DAY_STOPS,
  orderStops,
  scheduleVisits,
  walkingMinutes,
} from "~/domain/day-plan";
import { formatHours, formatTime, hoursOn } from "~/domain/opening-hours";
import { partitionEndingSoon } from "~/domain/trip";
import { getI18n } from "~/i18n/server";
import { formatWeekdayDate } from "~/i18n/format";
import { INTL_LOCALE } from "~/i18n/locales";
import { auth } from "~/server/auth";
import { type RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: `${t.pages.day.title} — ${t.app.name}`,
    description: t.pages.meta.day,
  };
}

type Candidate = RouterOutputs["trip"]["day"][number];

const VISIT_MINUTES = 90;
const fieldClass =
  "border-rule-soft bg-bg focus:border-fg min-h-11 border px-2 py-2 text-base font-normal tracking-normal normal-case";

function TripFields({ trip }: { trip: DayPlanParams["trip"] }) {
  return (
    <>
      {trip.place && <input type="hidden" name="place" value={trip.place} />}
      {trip.from && <input type="hidden" name="from" value={trip.from} />}
      {trip.to && <input type="hidden" name="to" value={trip.to} />}
    </>
  );
}

async function CandidateRow({
  candidate,
  checked,
  urgency,
  date,
}: {
  candidate: Candidate;
  checked: boolean;
  urgency: string | null;
  date: string;
}) {
  const { t } = await getI18n();
  const hours = hoursOn(candidate.openingHours, date);
  return (
    <li>
      <label className="flex min-h-11 items-start gap-3 py-2">
        <input
          type="checkbox"
          name="ids"
          value={candidate.id}
          defaultChecked={checked}
          className="accent-signal mt-1.5 h-4 w-4 shrink-0"
        />
        <span className="flex flex-col">
          <span
            lang={candidate.titleLang}
            className="font-serif text-lg leading-snug"
          >
            {candidate.title}
          </span>
          <span
            lang={candidate.museumLang}
            className="text-muted font-serif italic"
          >
            {candidate.museumName}
          </span>
          {hours === null ? (
            <span className="text-sm font-semibold">
              {t.pages.day.closedOn}
            </span>
          ) : (
            hours && (
              <span className="text-muted text-sm tabular-nums">
                {t.pages.day.openOn(formatHours(hours))}
              </span>
            )
          )}
          {urgency && (
            <span className="mt-1.5">
              <UrgencyLabel label={urgency} />
            </span>
          )}
        </span>
      </label>
    </li>
  );
}

export default async function DayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const i18n = await getI18n();
  const { t, locale } = i18n;
  const plan = parseDayPlan(await searchParams);
  const [museums, session] = await Promise.all([api.museum.list(), auth()]);
  const cities = [
    ...new Set(
      museums
        .map((museum) => museum.city)
        .filter((city): city is string => !!city),
    ),
  ].sort((a, b) => a.localeCompare(b, "fi"));
  const city = plan.city && cities.includes(plan.city) ? plan.city : null;
  const defaultCity =
    city ??
    (plan.trip.place && cities.includes(plan.trip.place)
      ? plan.trip.place
      : "");

  const picker = (
    <form
      key={`${plan.city}|${plan.date}`}
      method="get"
      className="border-rule-soft mb-8 flex flex-col gap-4 border-b pb-8 font-sans sm:flex-row sm:flex-wrap sm:items-end"
    >
      <TripFields trip={plan.trip} />
      <label className="text-kicker flex flex-col gap-1.5 sm:min-w-[12rem]">
        {t.pages.day.city}
        <select
          name="city"
          defaultValue={defaultCity}
          required
          className={fieldClass}
        >
          <option value="" disabled>
            {t.pages.day.chooseCity}
          </option>
          {cities.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="text-kicker flex flex-col gap-1.5">
        {t.pages.day.date}
        <input
          type="date"
          name="date"
          required
          defaultValue={plan.date ?? plan.trip.from ?? todayInHelsinki()}
          min={plan.trip.from ?? undefined}
          max={plan.trip.to ?? undefined}
          className={fieldClass}
        />
      </label>
      <button type="submit" className="btn btn-secondary">
        {t.pages.day.show}
      </button>
    </form>
  );

  if (!city || !plan.date)
    return (
      <>
        <p className="text-muted mb-6 max-w-prose">{t.pages.day.intro}</p>
        {picker}
        <EmptyState message={t.pages.day.missing} />
      </>
    );
  const date = plan.date;

  const candidates = await api.trip.day({ city, date, locale });
  const byId = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );
  const chosen = plan.ids.flatMap((id) => byId.get(id) ?? []);
  const chosenIds = new Set(chosen.map((candidate) => candidate.id));
  const inTrip =
    plan.trip.from !== null &&
    plan.trip.to !== null &&
    plan.trip.from <= date &&
    date <= plan.trip.to;
  const soonUntil = inTrip ? plan.trip.to : date;
  const endingSoonFirst = (list: Candidate[]) => {
    const { endingSoon, rest } = partitionEndingSoon(
      list,
      date,
      soonUntil,
      date,
    );
    return [...endingSoon, ...rest].map((candidate) => ({
      candidate,
      urgency: endingSoon.includes(candidate)
        ? urgencyLabelText(candidate, date, i18n)
        : null,
    }));
  };
  const interested = endingSoonFirst(
    candidates.filter((candidate) => candidate.interested),
  );
  const others = endingSoonFirst(
    candidates.filter((candidate) => !candidate.interested),
  );
  const validCount =
    chosen.length >= MIN_DAY_STOPS && chosen.length <= MAX_DAY_STOPS;
  const closedChosen = chosen.filter(
    (candidate) => hoursOn(candidate.openingHours, date) === null,
  );
  const openChosen = chosen.filter(
    (candidate) => !closedChosen.includes(candidate),
  );

  const itinerary = validCount
    ? orderStops(
        openChosen.map((candidate) => ({
          ...candidate,
          coordinates:
            candidate.latitude !== null && candidate.longitude !== null
              ? { latitude: candidate.latitude, longitude: candidate.longitude }
              : null,
        })),
      )
    : [];
  const orderedIds = itinerary.map(({ stop }) => stop.id);
  const schedule = scheduleVisits(
    itinerary.map(({ stop }) => hoursOn(stop.openingHours, date)),
    plan.start,
    VISIT_MINUTES,
  );
  const totalKm = itinerary.reduce((sum, leg) => sum + (leg.legKm ?? 0), 0);
  const totalMinutes = itinerary.reduce(
    (sum, leg) => sum + (leg.legKm === null ? 0 : walkingMinutes(leg.legKm)),
    0,
  );
  const calendarParams = new URLSearchParams({
    city,
    date,
    ids: orderedIds.join(","),
    start: plan.start,
  });

  return (
    <>
      <p className="text-muted mb-6 max-w-prose">{t.pages.day.intro}</p>
      {picker}

      <h2 className="text-headline mb-6 text-3xl">
        {city}
        <span className="text-muted ml-3 font-serif text-xl italic">
          {formatWeekdayDate(date, locale)}
        </span>
      </h2>

      {closedChosen.length > 0 && (
        <p role="status" className="mb-6 font-sans text-sm">
          <span className="font-semibold">{t.pages.day.closedStops}</span>{" "}
          {closedChosen
            .map((candidate) => `${candidate.title} (${candidate.museumName})`)
            .join(", ")}
        </p>
      )}

      {itinerary.length > 0 && (
        <section aria-labelledby="itinerary" className="mb-10">
          <h3
            id="itinerary"
            className="text-kicker border-rule mb-2 border-t pt-3"
          >
            {t.pages.day.itinerary}
          </h3>
          <ol>
            {itinerary.map(({ stop, legKm }, index) => {
              const visit = schedule[index]!;
              const next = itinerary[index + 1]?.stop;
              return (
                <li
                  key={stop.id}
                  className="border-rule-soft border-t first:border-t-0"
                >
                  <div className="flex gap-4 py-5">
                    <span
                      aria-hidden="true"
                      className="text-headline w-10 shrink-0 text-5xl tabular-nums"
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p
                        className={`text-kicker tabular-nums ${visit.kind === "visit" && !visit.cutShort ? "text-muted" : ""}`}
                      >
                        {visit.kind === "visit"
                          ? `${visit.start}–${visit.end}${visit.cutShort ? ` · ${t.pages.day.cutShort(formatTime(visit.end))}` : ""}`
                          : visit.kind === "tooLate"
                            ? t.pages.day.tooLate(formatTime(visit.close))
                            : t.pages.day.closedOn}
                      </p>
                      <Link
                        href={`/exhibitions/${stop.slug}`}
                        className="hover:text-signal font-serif text-xl leading-snug"
                      >
                        <span className="sr-only">{`${index + 1}. `}</span>
                        <span lang={stop.titleLang}>{stop.title}</span>
                      </Link>
                      <Link
                        href={`/museums/${stop.museumSlug}`}
                        lang={stop.museumLang}
                        className="text-muted hover:text-signal font-serif italic"
                      >
                        {stop.museumName}
                      </Link>
                      <p className="font-sans text-sm">
                        {stop.address ?? ""}
                        {stop.coordinates === null && (
                          <span className="text-muted">
                            {stop.address ? " · " : ""}
                            {t.pages.day.unknownLocation}
                          </span>
                        )}
                      </p>
                      {index > 0 && stop.coordinates !== null && (
                        <Link
                          href={dayPlanHref({
                            city,
                            date,
                            ids: [
                              stop.id,
                              ...orderedIds.filter((id) => id !== stop.id),
                            ],
                            start: plan.start,
                            trip: plan.trip,
                          })}
                          className="hover:text-signal inline-flex min-h-11 items-center self-start font-sans text-sm underline underline-offset-4"
                        >
                          {t.pages.day.startHere}
                        </Link>
                      )}
                    </div>
                  </div>
                  {next && legKm !== null && (
                    <div className="border-rule-soft flex items-center gap-4 border-t">
                      <span
                        aria-hidden="true"
                        className="text-muted w-10 shrink-0 text-center font-sans"
                      >
                        ↓
                      </span>
                      <p className="text-kicker">
                        {t.pages.day.walk(walkingMinutes(legKm))}
                      </p>
                      <RouteLink
                        points={[stop, next].map((point) => ({
                          name: point.museumName,
                          address: point.address,
                          latitude: point.latitude,
                          longitude: point.longitude,
                        }))}
                        label={t.pages.day.walkRoute}
                        ariaLabel={t.pages.day.walkRouteTo(next.museumName)}
                        className="hover:text-signal inline-flex min-h-11 items-center font-sans text-sm underline underline-offset-4"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="border-rule-soft border-t pt-3 font-sans text-sm">
            {t.pages.day.total(
              totalMinutes,
              totalKm.toLocaleString(INTL_LOCALE[locale], {
                maximumFractionDigits: 1,
              }),
            )}
          </p>
          <p className="text-muted mt-1 font-sans text-xs">
            {t.pages.day.straightLine}{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="hover:text-signal underline underline-offset-4"
            >
              {t.pages.day.osm}
            </a>
          </p>

          <div className="mt-6 flex flex-col gap-4 font-sans sm:flex-row sm:flex-wrap sm:items-end">
            <RouteLink
              points={itinerary.map(({ stop }) => ({
                name: stop.museumName,
                address: stop.address,
                latitude: stop.latitude,
                longitude: stop.longitude,
              }))}
            />
            <form method="get" className="flex items-end gap-2">
              <TripFields trip={plan.trip} />
              <input type="hidden" name="city" value={city} />
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="ids" value={orderedIds.join(",")} />
              <label className="text-kicker flex flex-col gap-1.5">
                {t.pages.day.startTime}
                <input
                  key={plan.start}
                  type="time"
                  name="start"
                  defaultValue={plan.start}
                  className={fieldClass}
                />
              </label>
              <button type="submit" className="btn btn-secondary">
                {t.pages.day.update}
              </button>
            </form>
            <a
              href={`/api/trip/day?${calendarParams.toString()}`}
              className="btn btn-secondary"
            >
              {t.pages.day.addToCalendar}
            </a>
          </div>
          {session?.user && (
            <div className="mt-4">
              <SaveTripButton
                trip={{
                  place: inTrip ? (plan.trip.place ?? "") : city,
                  from: inTrip ? plan.trip.from : date,
                  to: inTrip ? plan.trip.to : date,
                  day: {
                    city,
                    date,
                    exhibitionIds: orderedIds,
                    start: plan.start,
                  },
                }}
              />
            </div>
          )}
        </section>
      )}

      {candidates.length === 0 ? (
        <EmptyState message={t.pages.day.empty} />
      ) : (
        <form key={plan.ids.join(",")} method="get" className="font-sans">
          <TripFields trip={plan.trip} />
          <input type="hidden" name="city" value={city} />
          <input type="hidden" name="date" value={date} />
          {plan.start !== DEFAULT_START && (
            <input type="hidden" name="start" value={plan.start} />
          )}
          <fieldset>
            <legend className="text-kicker border-rule w-full border-t pt-3">
              {itinerary.length > 0 ? t.pages.day.edit : t.pages.day.interested}
            </legend>
            {interested.length > 0 ? (
              <ul className="divide-rule-soft divide-y">
                {interested.map(({ candidate, urgency }) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    urgency={urgency}
                    checked={chosenIds.has(candidate.id)}
                    date={date}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-muted py-3 text-sm">
                {t.pages.day.noInterested}
              </p>
            )}
          </fieldset>
          {others.length > 0 && (
            <details
              className="border-rule-soft mt-2 border-t"
              open={
                others.some(({ candidate }) => chosenIds.has(candidate.id)) ||
                interested.length === 0
              }
            >
              <summary className="text-kicker flex min-h-11 cursor-pointer items-center">
                {t.pages.day.more(others.length)}
              </summary>
              <ul className="divide-rule-soft divide-y">
                {others.map(({ candidate, urgency }) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    urgency={urgency}
                    checked={chosenIds.has(candidate.id)}
                    date={date}
                  />
                ))}
              </ul>
            </details>
          )}
          <div className="border-rule-soft mt-4 flex flex-wrap items-center gap-4 border-t pt-4">
            <button type="submit" className="btn btn-primary">
              {t.pages.day.plan}
            </button>
            <p
              className={`text-sm ${plan.ids.length > 0 && !validCount ? "text-signal font-semibold" : "text-muted"}`}
            >
              {t.pages.day.choose(MIN_DAY_STOPS, MAX_DAY_STOPS)}
            </p>
          </div>
        </form>
      )}
    </>
  );
}
