import { addDays } from "./dates";
import { haversineKm, walkingMinutes, type Coordinates } from "./day-plan";
import {
  hoursOn,
  toMinutes,
  type TimeOfDay,
  type WeeklyHours,
} from "./opening-hours";

export const NEARBY_RADII_KM = [2, 5, 10] as const;
export type NearbyRadiusKm = (typeof NEARBY_RADII_KM)[number];
export const MAX_NEARBY_RADIUS_KM: NearbyRadiusKm = 10;
export const CLOSING_SOON_MINUTES = 45;

/** Three decimals: about 110 m of latitude and 55 m of longitude in Finland. */
export function roundCoordinates({
  latitude,
  longitude,
}: Coordinates): Coordinates {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return { latitude: round(latitude), longitude: round(longitude) };
}

export interface HelsinkiClock {
  /** `YYYY-MM-DD` */
  readonly date: string;
  /** Minutes since local midnight. */
  readonly minutes: number;
}

export function helsinkiClock(instant: Date): HelsinkiClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Helsinki",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** Closing at or before opening means closing after midnight. */
function span(open: TimeOfDay, close: TimeOfDay) {
  const start = toMinutes(open);
  const end = toMinutes(close);
  return { start, end: end <= start ? end + 24 * 60 : end };
}

export type OpenState =
  | {
      readonly open: true;
      readonly closes: TimeOfDay;
      readonly closingSoon: boolean;
    }
  | { readonly open: false };

export function openState(
  weekly: WeeklyHours | null | undefined,
  { date, minutes }: HelsinkiClock,
): OpenState {
  const candidates = [
    { hours: hoursOn(weekly, date), offset: 0 },
    { hours: hoursOn(weekly, addDays(date, -1)), offset: 24 * 60 },
  ];
  for (const { hours, offset } of candidates) {
    if (!hours) continue;
    const { start, end } = span(hours.open, hours.close);
    const now = minutes + offset;
    if (now >= start && now < end)
      return {
        open: true,
        closes: hours.close,
        closingSoon: end - now <= CLOSING_SOON_MINUTES,
      };
  }
  return { open: false };
}

export interface NextOpening {
  readonly date: string;
  readonly opens: TimeOfDay;
}

/** The next opening after `clock` within a week; undefined when hours are unknown or always closed. */
export function nextOpening(
  weekly: WeeklyHours | null | undefined,
  clock: HelsinkiClock,
): NextOpening | undefined {
  for (let offset = 0; offset <= 7; offset++) {
    const date = addDays(clock.date, offset);
    const hours = hoursOn(weekly, date);
    if (!hours) continue;
    if (offset === 0 && toMinutes(hours.open) <= clock.minutes) continue;
    return { date, opens: hours.open };
  }
  return undefined;
}

export interface Distance {
  readonly km: number;
  readonly walkingMinutes: number;
}

export function distanceFrom(origin: Coordinates, to: Coordinates): Distance {
  const km = haversineKm(origin, to);
  return { km, walkingMinutes: walkingMinutes(km) };
}

export interface NearbyPlace {
  readonly coordinates: Coordinates;
  readonly openingHours: WeeklyHours | null;
}

export interface OpenNearby<T> {
  readonly place: T;
  readonly distance: Distance;
  readonly closes: TimeOfDay;
  readonly closingSoon: boolean;
}

/** Places open at `clock` within `radiusKm`, nearest first. */
export function openNearby<T extends NearbyPlace>(
  places: readonly T[],
  origin: Coordinates,
  radiusKm: number,
  clock: HelsinkiClock,
): OpenNearby<T>[] {
  return places
    .flatMap((place) => {
      const distance = distanceFrom(origin, place.coordinates);
      if (distance.km > radiusKm) return [];
      const state = openState(place.openingHours, clock);
      if (!state.open) return [];
      return [
        {
          place,
          distance,
          closes: state.closes,
          closingSoon: state.closingSoon,
        },
      ];
    })
    .sort((a, b) => a.distance.km - b.distance.km);
}

/** The place within `radiusKm` that opens soonest, nearest on a tie. */
export function nextToOpen<T extends NearbyPlace>(
  places: readonly T[],
  origin: Coordinates,
  radiusKm: number,
  clock: HelsinkiClock,
): { place: T; opening: NextOpening } | undefined {
  let best: { place: T; opening: NextOpening; km: number } | undefined;
  for (const place of places) {
    const km = haversineKm(origin, place.coordinates);
    if (km > radiusKm) continue;
    const opening = nextOpening(place.openingHours, clock);
    if (!opening) continue;
    const key = `${opening.date}T${opening.opens}`;
    const bestKey = best && `${best.opening.date}T${best.opening.opens}`;
    if (!best || key < bestKey! || (key === bestKey && km < best.km))
      best = { place, opening, km };
  }
  return best && { place: best.place, opening: best.opening };
}
