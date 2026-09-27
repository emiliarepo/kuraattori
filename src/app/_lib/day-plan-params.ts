type SearchParams = Record<string, string | string[] | undefined>;

export interface DayPlanParams {
  readonly city: string | null;
  readonly date: string | null;
  /** Chosen exhibitions, first stop first. */
  readonly ids: readonly number[];
  readonly start: string;
  /** The trip this day belongs to, carried so the Matka tab and saving keep it. */
  readonly trip: {
    readonly place: string | null;
    readonly from: string | null;
    readonly to: string | null;
  };
}

export const DEFAULT_START = "11:00";
// Above the planner's maximum, so an over-long selection is reported rather than cut.
const MAX_IDS = 20;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function nonEmpty(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

function isoDateOrNull(value: string | undefined): string | null {
  return value && ISO_DATE.test(value) ? value : null;
}

export function parseDayPlan(searchParams: SearchParams): DayPlanParams {
  const rawIds = [searchParams.ids ?? []]
    .flat()
    .flatMap((value) => value.split(","));
  const ids = [
    ...new Set(
      rawIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ].slice(0, MAX_IDS);
  const start = first(searchParams.start);
  return {
    city: nonEmpty(first(searchParams.city)),
    date: isoDateOrNull(first(searchParams.date)),
    ids,
    start: start && TIME.test(start) ? start : DEFAULT_START,
    trip: {
      place: nonEmpty(first(searchParams.place)),
      from: isoDateOrNull(first(searchParams.from)),
      to: isoDateOrNull(first(searchParams.to)),
    },
  };
}

/** Query string for a trip's place and dates, shared by both sub-tabs. */
export function tripQuery(trip: DayPlanParams["trip"]): URLSearchParams {
  const params = new URLSearchParams();
  if (trip.place) params.set("place", trip.place);
  if (trip.from) params.set("from", trip.from);
  if (trip.to) params.set("to", trip.to);
  return params;
}

export function dayPlanHref(plan: {
  city: string;
  date: string;
  ids?: readonly number[];
  start?: string;
  trip?: DayPlanParams["trip"];
}): string {
  const params = plan.trip ? tripQuery(plan.trip) : new URLSearchParams();
  params.set("city", plan.city);
  params.set("date", plan.date);
  if (plan.ids?.length) params.set("ids", plan.ids.join(","));
  if (plan.start && plan.start !== DEFAULT_START)
    params.set("start", plan.start);
  return `/trip/day?${params.toString()}`;
}
