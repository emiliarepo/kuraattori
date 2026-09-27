/**
 * Proposes category weight changes from visit ratings. Not used by ranking
 * yet: the proposals are data for tuning the weights later.
 */

export type VisitRating = "up" | "down";

/** `-1` Ei kiinnosta, `0` no interest row, `1` Kiinnostaa, `2` Erityisesti. */
export type CategoryWeightLevel = -1 | 0 | 1 | 2;

export interface RatedVisit {
  readonly categoryIds: readonly number[];
  readonly rating: VisitRating;
}

export interface WeightNudge {
  readonly categoryId: number;
  readonly from: CategoryWeightLevel;
  readonly to: CategoryWeightLevel;
  readonly up: number;
  readonly down: number;
}

/** A category needs this many ratings before it is nudged. */
export const MIN_RATINGS = 3;
/** `(up - down) / total` must reach this share in either direction. */
export const MIN_NET_SHARE = 0.5;

/**
 * One step per category towards the ratings' majority, at most. Categories
 * with too few ratings, a split verdict, or already at the end of the scale
 * get no nudge. Sorted by category id.
 */
export function proposeWeightNudges(
  visits: readonly RatedVisit[],
  currentWeights: ReadonlyMap<number, CategoryWeightLevel>,
): WeightNudge[] {
  const counts = new Map<number, { up: number; down: number }>();
  for (const visit of visits)
    for (const categoryId of new Set(visit.categoryIds)) {
      const count = counts.get(categoryId) ?? { up: 0, down: 0 };
      count[visit.rating] += 1;
      counts.set(categoryId, count);
    }

  const nudges: WeightNudge[] = [];
  for (const [categoryId, { up, down }] of counts) {
    const total = up + down;
    if (total < MIN_RATINGS) continue;
    const share = (up - down) / total;
    const step = share >= MIN_NET_SHARE ? 1 : share <= -MIN_NET_SHARE ? -1 : 0;
    const from = currentWeights.get(categoryId) ?? 0;
    const to = Math.min(2, Math.max(-1, from + step)) as CategoryWeightLevel;
    if (to !== from) nudges.push({ categoryId, from, to, up, down });
  }
  return nudges.sort((a, b) => a.categoryId - b.categoryId);
}
