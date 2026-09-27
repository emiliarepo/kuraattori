import { toMinutes, type DayHours } from "./opening-hours";

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface PlanStop {
  readonly id: number;
  readonly coordinates: Coordinates | null;
}

export interface OrderedStop<T extends PlanStop> {
  readonly stop: T;
  /** Straight-line distance to the next stop; null for the last stop or when either end has no coordinates. */
  readonly legKm: number | null;
}

export const MIN_DAY_STOPS = 2;
export const MAX_DAY_STOPS = 6;

const EARTH_RADIUS_KM = 6371;
const WALKING_KMH = 5;

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function walkingMinutes(km: number): number {
  return Math.max(1, Math.round((km / WALKING_KMH) * 60));
}

function pathLength(path: readonly Coordinates[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++)
    total += haversineKm(path[i]!, path[i + 1]!);
  return total;
}

/**
 * Nearest-neighbour from the first stop, then 2-opt with the first stop kept
 * fixed. Stops without coordinates keep their relative order at the end.
 */
export function orderStops<T extends PlanStop>(
  stops: readonly T[],
): OrderedStop<T>[] {
  const located = stops.filter(
    (stop): stop is T & { coordinates: Coordinates } =>
      stop.coordinates !== null,
  );
  const unlocated = stops.filter((stop) => stop.coordinates === null);

  const route: (T & { coordinates: Coordinates })[] = [];
  const remaining = [...located];
  if (remaining.length > 0) route.push(remaining.shift()!);
  while (remaining.length > 0) {
    const last = route[route.length - 1]!.coordinates;
    let best = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (
        haversineKm(last, remaining[i]!.coordinates) <
        haversineKm(last, remaining[best]!.coordinates)
      )
        best = i;
    }
    route.push(remaining.splice(best, 1)[0]!);
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const candidate = [
          ...route.slice(0, i),
          ...route.slice(i, j + 1).reverse(),
          ...route.slice(j + 1),
        ];
        if (
          pathLength(candidate.map((s) => s.coordinates)) + 1e-9 <
          pathLength(route.map((s) => s.coordinates))
        ) {
          route.splice(0, route.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  const ordered: T[] = [...route, ...unlocated];
  return ordered.map((stop, index) => {
    const next = ordered[index + 1];
    return {
      stop,
      legKm:
        next && stop.coordinates && next.coordinates
          ? haversineKm(stop.coordinates, next.coordinates)
          : null,
    };
  });
}

/** Adds `minutes` to an `HH:MM` time of day; returns `HH:MM`, wrapping past midnight. */
export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number) as [number, number];
  const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export type ScheduledVisit =
  | { readonly kind: "closed" }
  | {
      readonly kind: "visit";
      readonly start: string;
      readonly end: string;
      /** The museum closes before the full visit length. */
      readonly cutShort: boolean;
    }
  | { readonly kind: "tooLate"; readonly close: string };

/**
 * Visits back to back from `start`, each waiting for its museum to open and
 * ending at closing time at the latest. `hours` is per stop in route order:
 * `null` closed that day, `undefined` unknown (no constraint).
 */
export function scheduleVisits(
  hours: readonly (DayHours | null | undefined)[],
  start: string,
  visitMinutes: number,
): ScheduledVisit[] {
  let cursor = toMinutes(start);
  return hours.map((day) => {
    if (day === null) return { kind: "closed" };
    const visitStart = day ? Math.max(cursor, toMinutes(day.open)) : cursor;
    const close = day ? toMinutes(day.close) : Infinity;
    if (visitStart >= close) return { kind: "tooLate", close: day!.close };
    const visitEnd = Math.min(visitStart + visitMinutes, close);
    cursor = visitEnd;
    return {
      kind: "visit",
      start: addMinutes("00:00", visitStart),
      end: addMinutes("00:00", visitEnd),
      cutShort: visitEnd < visitStart + visitMinutes,
    };
  });
}
