import { daysBetween } from "./dates";
import type { VisitRating } from "./rating-nudges";

/** A rating's weight halves every year: tastes drift, and a recent 👍 says more than an old one. */
export const RATING_HALF_LIFE_DAYS = 365;

export interface RatedVisit {
  readonly categoryIds: readonly number[];
  readonly museumId: number;
  readonly rating: VisitRating;
  /** `YYYY-MM-DD`; null counts as today. */
  readonly visitedAt: string | null;
}

/** Decayed net ratings (👍 = +1, 👎 = −1) per category and per museum. */
export interface LearnedAffinity {
  readonly categories: ReadonlyMap<number, number>;
  readonly museums: ReadonlyMap<number, number>;
}

export const NO_LEARNED_AFFINITY: LearnedAffinity = {
  categories: new Map(),
  museums: new Map(),
};

export function learnAffinity(
  visits: readonly RatedVisit[],
  today: string,
): LearnedAffinity {
  const categories = new Map<number, number>();
  const museums = new Map<number, number>();
  const add = (map: Map<number, number>, id: number, amount: number) =>
    map.set(id, (map.get(id) ?? 0) + amount);

  for (const visit of visits) {
    const ageDays =
      visit.visitedAt === null
        ? 0
        : Math.max(0, daysBetween(visit.visitedAt, today));
    const amount =
      (visit.rating === "up" ? 1 : -1) *
      0.5 ** (ageDays / RATING_HALF_LIFE_DAYS);
    for (const categoryId of new Set(visit.categoryIds))
      add(categories, categoryId, amount);
    add(museums, visit.museumId, amount);
  }
  return { categories, museums };
}
