import { daysBetween } from "./dates";

/** `HH:MM`, 24-hour. */
export type TimeOfDay = string;

export interface DayHours {
  readonly open: TimeOfDay;
  readonly close: TimeOfDay;
}

/** Monday first; `null` is a closed day. */
export type WeeklyHours = readonly [
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
];

/** 0 = Monday … 6 = Sunday, for an ISO `YYYY-MM-DD` date. */
export function weekdayIndex(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return (day + 6) % 7;
}

/** The hours on `isoDate`: `null` when closed, `undefined` when unknown. */
export function hoursOn(
  weekly: WeeklyHours | null | undefined,
  isoDate: string,
): DayHours | null | undefined {
  if (!weekly) return undefined;
  return weekly[weekdayIndex(isoDate)];
}

/** The first free day on or after `today`, if it falls within `withinDays`. */
export function nextFreeDay(
  freeDays: readonly string[] | null | undefined,
  today: string,
  withinDays = Infinity,
): string | undefined {
  return (freeDays ?? [])
    .filter((day) => day >= today && daysBetween(today, day) <= withinDays)
    .sort()[0];
}

export function toMinutes(time: TimeOfDay): number {
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  return hours * 60 + minutes;
}

/** `10:00` → `10`, `10:30` → `10.30`, as Finnish signage writes them. */
export function formatTime(time: TimeOfDay): string {
  const [hours, minutes] = time.split(":") as [string, string];
  return minutes === "00"
    ? String(Number(hours))
    : `${Number(hours)}.${minutes}`;
}

/** `10–18` */
export function formatHours(hours: DayHours): string {
  return `${formatTime(hours.open)}–${formatTime(hours.close)}`;
}

export interface OpeningHours {
  readonly days: WeeklyHours;
  /** The museum's own free text under the table: seasons, exceptions, links. */
  readonly note?: string;
}
