"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { timeBarProps } from "~/app/_lib/exhibition-format";
import { isApplePlatform, mapHref } from "~/app/_lib/maps";
import { getPhase } from "~/domain/dates";
import type { Coordinates } from "~/domain/day-plan";
import { localized } from "~/domain/localized";
import {
  helsinkiClock,
  NEARBY_RADII_KM,
  nextToOpen,
  openNearby,
  roundCoordinates,
  type HelsinkiClock,
  type NearbyRadiusKm,
} from "~/domain/nearby";
import { formatTime } from "~/domain/opening-hours";
import { useI18n } from "~/i18n/client";
import { formatWeekday } from "~/i18n/format";
import { INTL_LOCALE } from "~/i18n/locales";
import { api, type RouterOutputs } from "~/trpc/react";
import { takeLocateIntent } from "./locate-intent";

type Museum = RouterOutputs["nearby"]["museums"]["museums"][number];
type Failure = "denied" | "unavailable" | "timeout" | "failed";
type Origin =
  { kind: "device"; coordinates: Coordinates } | { kind: "city"; city: string };

const EXHIBITIONS_SHOWN = 2;

export function NearbyFinder({
  cityGroups,
  initialCity,
  initialRadius,
}: {
  cityGroups: { region: string; cities: string[] }[];
  initialCity: string | undefined;
  initialRadius: NearbyRadiusKm;
}) {
  const { t } = useI18n();
  const [locating, setLocating] = useState(false);
  const [failure, setFailure] = useState<Failure>();
  const [origin, setOrigin] = useState<Origin>();
  const [radius, setRadius] = useState(initialRadius);
  const [city, setCity] = useState(initialCity ?? "");
  const museums = api.nearby.museums.useMutation({
    onError: () => setFailure("failed"),
  });

  function updateUrl(next: { city?: string; km: NearbyRadiusKm }) {
    const params = new URLSearchParams();
    if (next.city) params.set("city", next.city);
    if (next.km !== 2) params.set("km", String(next.km));
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : "/nearby");
  }

  function showCity(name: string) {
    setFailure(undefined);
    setOrigin({ kind: "city", city: name });
    updateUrl({ city: name, km: radius });
    museums.mutate({ city: name });
  }

  function locate() {
    setFailure(undefined);
    if (!("geolocation" in navigator)) {
      setFailure("unavailable");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const coordinates = roundCoordinates(coords);
        setOrigin({ kind: "device", coordinates });
        updateUrl({ km: radius });
        museums.mutate(coordinates);
      },
      (error) => {
        setLocating(false);
        setFailure(
          error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "unavailable",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  useEffect(() => {
    if (takeLocateIntent()) locate();
    else if (initialCity) showCity(initialCity);
    // Runs once on arrival; both paths only start from a user's tap or a shared city link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = locating || museums.isPending;
  const originCoordinates =
    origin?.kind === "device"
      ? origin.coordinates
      : (museums.data?.origin ?? undefined);

  return (
    <div>
      {(!origin || failure) && (
        <div className="flex flex-col gap-4">
          {failure && (
            <p
              role="alert"
              className="text-signal font-sans text-sm font-semibold"
            >
              {t.pages.nearby[failure]}
            </p>
          )}
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={locate}
              disabled={busy}
              aria-busy={locating}
            >
              {locating ? t.pages.nearby.locating : t.pages.nearby.locate}
            </button>
          </div>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (city) showCity(city);
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-kicker text-muted">
                {t.pages.nearby.orCity}
              </span>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="border-rule-soft bg-bg min-h-11 border px-3 font-sans text-sm"
                aria-label={t.pages.nearby.city}
              >
                <option value="">{t.pages.nearby.chooseCity}</option>
                {cityGroups.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.cities.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={busy || !city}
            >
              {t.pages.nearby.showCity}
            </button>
          </form>
        </div>
      )}

      {origin && !failure && (
        <Results
          origin={origin}
          coordinates={originCoordinates}
          museums={museums.data?.museums}
          loading={museums.isPending}
          radius={radius}
          onRadius={(km) => {
            setRadius(km);
            updateUrl({
              city: origin.kind === "city" ? origin.city : undefined,
              km,
            });
          }}
          onChangeLocation={() => {
            setOrigin(undefined);
            museums.reset();
            updateUrl({ km: radius });
          }}
        />
      )}
    </div>
  );
}

function useHelsinkiClock(): HelsinkiClock {
  const [clock, setClock] = useState(() => helsinkiClock(new Date()));
  useEffect(() => {
    const timer = setInterval(
      () => setClock(helsinkiClock(new Date())),
      60_000,
    );
    return () => clearInterval(timer);
  }, []);
  return clock;
}

function Results({
  origin,
  coordinates,
  museums,
  loading,
  radius,
  onRadius,
  onChangeLocation,
}: {
  origin: Origin;
  coordinates: Coordinates | undefined;
  museums: Museum[] | undefined;
  loading: boolean;
  radius: NearbyRadiusKm;
  onRadius: (km: NearbyRadiusKm) => void;
  onChangeLocation: () => void;
}) {
  const i18n = useI18n();
  const { t, locale } = i18n;
  const clock = useHelsinkiClock();
  const [apple, setApple] = useState(false);
  useEffect(() => {
    setApple(
      isApplePlatform(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints,
      ),
    );
  }, []);

  const places = museums ?? [];
  const open = coordinates
    ? openNearby(places, coordinates, radius, clock)
    : [];
  const next =
    coordinates && open.length === 0
      ? nextToOpen(places, coordinates, radius, clock)
      : undefined;
  const km = new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <section aria-labelledby="nearby-results" aria-busy={loading}>
      <div className="border-rule-soft mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <h2 id="nearby-results" className="text-headline text-2xl">
          {origin.kind === "city"
            ? t.pages.nearby.nearCity(origin.city)
            : t.pages.nearby.nearYou}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div
            role="group"
            aria-label={t.pages.nearby.radius}
            className="border-rule flex border font-sans"
          >
            {NEARBY_RADII_KM.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === radius}
                onClick={() => onRadius(option)}
                className={`border-rule min-h-11 px-4 text-sm font-semibold tabular-nums transition-colors duration-150 not-first:border-l ${
                  option === radius
                    ? "bg-signal text-on-signal"
                    : "hover:bg-surface"
                }`}
              >
                {t.pages.nearby.radiusOption(option)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onChangeLocation}
            className="hover:text-signal min-h-11 font-sans text-sm font-semibold underline underline-offset-4"
          >
            {t.pages.nearby.changeLocation}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted font-sans text-sm" role="status">
          {t.pages.nearby.loading}
        </p>
      ) : open.length === 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted italic">{t.pages.nearby.empty}</p>
          {next && (
            <p className="font-sans text-sm">
              {t.pages.nearby.nextOpens(
                localized(next.place, "name", locale).text,
                next.opening.date === clock.date
                  ? t.pages.nearby.opensToday(formatTime(next.opening.opens))
                  : t.pages.nearby.opensOn(
                      formatWeekday(next.opening.date, locale),
                      formatTime(next.opening.opens),
                    ),
              )}
            </p>
          )}
        </div>
      ) : (
        <ul aria-label={t.pages.nearby.title}>
          {open.map(({ place, distance, closes, closingSoon }) => {
            const name = localized(place, "name", locale);
            const current = place.exhibitions.filter(
              (exhibition) => getPhase(exhibition, clock.date) === "current",
            );
            const hidden = current.length - EXHIBITIONS_SHOWN;
            return (
              <li
                key={place.id}
                className="border-rule-soft flex flex-col gap-1.5 border-t py-5 first:border-t-0 first:pt-0"
              >
                <h3 className="text-headline text-xl sm:text-2xl">
                  <Link
                    href={`/museums/${place.slug}`}
                    lang={name.lang}
                    className="hover:text-signal"
                  >
                    {name.text}
                  </Link>
                </h3>
                <p className="font-sans text-sm tabular-nums">
                  <span className="text-muted">
                    {t.pages.nearby.distance(
                      km.format(distance.km),
                      distance.walkingMinutes,
                    )}
                  </span>
                  {" · "}
                  <span
                    className={
                      closingSoon ? "text-signal font-semibold" : undefined
                    }
                  >
                    {t.pages.nearby.openUntil(formatTime(closes))}
                    {closingSoon && ` · ${t.pages.nearby.closingSoon}`}
                  </span>
                </p>
                {current.length === 0 ? (
                  <p className="text-muted text-sm italic">
                    {t.pages.nearby.noExhibitions}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {current.slice(0, EXHIBITIONS_SHOWN).map((exhibition) => {
                      const title = localized(exhibition, "title", locale);
                      const bar = timeBarProps(exhibition, clock.date, i18n);
                      return (
                        <li
                          key={exhibition.id}
                          className="flex flex-wrap items-baseline gap-x-2"
                        >
                          <Link
                            href={`/exhibitions/${exhibition.slug}`}
                            lang={title.lang}
                            className="hover:text-signal underline-offset-4 hover:underline"
                          >
                            {title.text}
                          </Link>
                          {bar.urgent && (
                            <span className="text-signal font-sans text-xs font-semibold">
                              {bar.remainingLabel}
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {hidden > 0 && (
                      <li>
                        <Link
                          href={`/museums/${place.slug}`}
                          aria-label={`${t.pages.nearby.more(hidden)}: ${name.text}`}
                          className="hover:text-signal font-sans text-sm underline underline-offset-4"
                        >
                          {t.pages.nearby.more(hidden)}
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
                <a
                  href={mapHref(
                    name.text,
                    place.address ?? place.city ?? "",
                    apple,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.pages.museums.showOnMap}: ${name.text}`}
                  className="hover:text-signal self-start py-2 font-sans text-sm underline underline-offset-4"
                >
                  {t.pages.museums.showOnMap}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-muted mt-6 font-sans text-xs">
        {t.pages.nearby.straightLine}
      </p>
    </section>
  );
}
