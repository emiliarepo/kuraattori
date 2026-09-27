"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { dayPlanHref } from "~/app/_lib/day-plan-params";
import type { I18n } from "~/i18n";
import { useI18n } from "~/i18n/client";
import { formatDate, formatDayMonth } from "~/i18n/format";
import { api, type RouterOutputs } from "~/trpc/react";

type SavedTrip = RouterOutputs["trip"]["saved"][number];

function tripLabel(trip: SavedTrip, { t, locale }: I18n) {
  return `${trip.place || t.pages.trip.allPlacesTrip} · ${formatDayMonth(trip.fromDate, locale)}–${formatDate(trip.toDate, locale)}`;
}

export function SavedTrips({ trips }: { trips: SavedTrip[] }) {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const router = useRouter();
  const remove = api.trip.remove.useMutation({
    onSuccess: () => router.refresh(),
  });
  if (trips.length === 0) return null;

  return (
    <section aria-labelledby="saved-trips" className="mb-8">
      <h2 id="saved-trips" className="text-kicker mb-2">
        {t.pages.trip.savedTrips}
      </h2>
      <ul className="divide-rule-soft border-rule-soft divide-y border-y">
        {trips.map((trip) => {
          const context = {
            place: trip.place || null,
            from: trip.fromDate,
            to: trip.toDate,
          };
          const params = new URLSearchParams({
            from: trip.fromDate,
            to: trip.toDate,
          });
          if (trip.place) params.set("place", trip.place);
          return (
            <li
              key={trip.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 font-sans text-sm"
            >
              <Link
                href={`/trip?${params.toString()}`}
                className="hover:text-signal inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                {tripLabel(trip, i18n)}
              </Link>
              {trip.days.map((day) => (
                <Link
                  key={`${day.city}-${day.date}`}
                  href={dayPlanHref({
                    ...day,
                    ids: day.exhibitionIds,
                    trip: context,
                  })}
                  className="hover:text-signal inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  {`${t.pages.trip.tabDay} ${formatDayMonth(day.date, locale)} ${day.city}`}
                </Link>
              ))}
              <button
                type="button"
                aria-label={t.pages.trip.removeTrip(tripLabel(trip, i18n))}
                disabled={remove.isPending}
                onClick={() => remove.mutate({ id: trip.id })}
                className="text-muted hover:text-signal ml-auto min-h-11 px-2 underline underline-offset-4"
              >
                {t.pages.trip.remove}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
