import { daysBetween, type ExhibitionDates } from "./dates";
import { ENDING_SOON_DAYS } from "./urgency";

/**
 * Ends during the trip, or within the ending-soon window counted from the
 * trip's first day that is not in the past.
 */
export function endsSoonForTrip(
  exhibition: Pick<ExhibitionDates, "endDate">,
  from: string,
  to: string,
  today: string,
): boolean {
  if (exhibition.endDate === null) return false;
  const start = from > today ? from : today;
  if (exhibition.endDate < start) return false;
  return (
    exhibition.endDate <= to ||
    daysBetween(start, exhibition.endDate) <= ENDING_SOON_DAYS
  );
}

/** Stable split: each group keeps the incoming (relevance) order. */
export function partitionEndingSoon<T extends Pick<ExhibitionDates, "endDate">>(
  items: readonly T[],
  from: string,
  to: string,
  today: string,
): { endingSoon: T[]; rest: T[] } {
  const endingSoon: T[] = [];
  const rest: T[] = [];
  for (const item of items)
    (endsSoonForTrip(item, from, to, today) ? endingSoon : rest).push(item);
  return { endingSoon, rest };
}
