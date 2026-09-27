export type ExhibitionPhase = "current" | "upcoming" | "ended";

export interface ExhibitionDates {
  readonly startDate: string;
  readonly endDate: string | null;
}

function parseIsoDate(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  return Date.UTC(year, month - 1, day);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to) - parseIsoDate(from)) / 86_400_000);
}

export function addDays(isoDate: string, days: number): string {
  return new Date(parseIsoDate(isoDate) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Every date from `from` to `to` inclusive, at most `limit` of them. */
export function datesInRange(
  from: string,
  to: string,
  limit: number,
): string[] {
  const dates: string[] = [];
  for (
    let day = parseIsoDate(from);
    day <= parseIsoDate(to) && dates.length < limit;
    day += 86_400_000
  )
    dates.push(new Date(day).toISOString().slice(0, 10));
  return dates;
}

/** Today's date as `YYYY-MM-DD` in Europe/Helsinki. */
export function todayInHelsinki(reference = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}

export function getPhase(
  exhibition: ExhibitionDates,
  today: string,
): ExhibitionPhase {
  if (exhibition.startDate > today) return "upcoming";
  if (exhibition.endDate !== null && exhibition.endDate < today) return "ended";
  return "current";
}

/** Days until `endDate`, 0 if it ends today, negative if already ended, null with no end date. */
export function getDaysRemaining(
  exhibition: Pick<ExhibitionDates, "endDate">,
  today: string,
): number | null {
  if (exhibition.endDate === null) return null;
  return daysBetween(today, exhibition.endDate);
}

/** Whether the run overlaps `[from, to]`: starts on/before `to`, and ends on/after `from` or never ends. */
export function overlapsRange(
  exhibition: ExhibitionDates,
  from: string,
  to: string,
): boolean {
  return (
    exhibition.startDate <= to &&
    (exhibition.endDate === null || exhibition.endDate >= from)
  );
}

/** Percentage through the run, clamped to [0, 100]; null with no end date (no bar). */
export function getTimeBarProgress(
  exhibition: ExhibitionDates,
  today: string,
): number | null {
  if (exhibition.endDate === null) return null;
  const total = daysBetween(exhibition.startDate, exhibition.endDate);
  if (total <= 0) return 100;
  const elapsed = daysBetween(exhibition.startDate, today);
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}
