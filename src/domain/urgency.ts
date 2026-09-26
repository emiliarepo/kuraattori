import { daysBetween, type ExhibitionDates } from "./dates";

/** 0-100. Ended exhibitions and ones with no end date are never urgent. */
export function getUrgency(
  exhibition: Pick<ExhibitionDates, "endDate">,
  today: string,
): number {
  if (exhibition.endDate === null) return 0;
  const daysRemaining = daysBetween(today, exhibition.endDate);
  if (daysRemaining < 0) return 0;
  if (daysRemaining === 0) return 100;
  if (daysRemaining === 1) return 90;
  if (daysRemaining <= 6) return 75;
  if (daysRemaining <= 14) return 50;
  if (daysRemaining <= 30) return 25;
  if (daysRemaining <= 60) return 10;
  return 0;
}
