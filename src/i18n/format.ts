import { t } from "./fi";

function parseIsoDate(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  return Date.UTC(year, month - 1, day);
}

const fullDateFormatter = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const dayMonthFormatter = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  timeZone: "UTC",
});

/** `27.9.2026` */
export function formatDate(isoDate: string): string {
  return fullDateFormatter.format(parseIsoDate(isoDate));
}

/** `2.10.` */
export function formatDayMonth(isoDate: string): string {
  return dayMonthFormatter.format(parseIsoDate(isoDate));
}

/** `3 päivää jäljellä` / `1 päivä jäljellä` / `Päättyy tänään`. `daysRemaining` must be >= 0. */
export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining === 0) return t.time.endsToday;
  if (daysRemaining === 1) return t.time.daysRemainingOne;
  return t.time.daysRemaining(daysRemaining);
}

/** `Alkaa 2.10.` */
export function formatUpcomingStart(startDate: string): string {
  return t.time.startsOn(formatDayMonth(startDate));
}
