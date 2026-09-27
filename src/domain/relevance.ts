import { daysBetween } from "./dates";
import { NO_LEARNED_AFFINITY, type LearnedAffinity } from "./learned-affinity";

const FIRST_CATEGORY_POINTS = 40;
const ADDITIONAL_CATEGORY_POINTS = 15;
const CATEGORY_CAP = 70;
const REGION_POINTS = 20;
const MUSEUM_POINTS = 15;
const NEW_POINTS = 10;
const NEW_WITHIN_DAYS = 14;
/**
 * Learned from 👍/👎: each part approaches its maximum as net ratings grow
 * (`max * (1 - e^(-net / 3))`), and their sum is capped below a followed
 * museum, so it reorders close candidates but never outweighs a manual choice.
 */
const LEARNED_CATEGORY_MAX = 8;
const LEARNED_MUSEUM_MAX = 6;
const LEARNED_CAP = 12;
const LEARNED_SATURATION = 3;

/** `1` = Kiinnostaa, `2` = Erityisesti. `-1` ("Ei kiinnosta") never scores; see `excludedCategoryIds`. */
export type InterestWeight = 1 | 2;

export type RelevanceReason =
  | {
      readonly type: "category";
      readonly categoryId: number;
      readonly weight: InterestWeight;
      readonly points: number;
    }
  | { readonly type: "region"; readonly points: number }
  | { readonly type: "museum"; readonly points: number }
  | { readonly type: "new"; readonly points: number }
  | {
      readonly type: "learned";
      /** Negative after 👎; such a reason lowers the score but is never shown. */
      readonly points: number;
      /** Whichever of the two contributed more. */
      readonly basis: "category" | "museum";
    };

export interface RelevanceResult {
  readonly score: number;
  readonly reasons: readonly RelevanceReason[];
  /** The exhibition has a category the user marked "Ei kiinnosta". */
  readonly hasExcludedMatch: boolean;
}

export interface RelevanceExhibition {
  readonly categoryIds: readonly number[];
  readonly region: string | null;
  readonly museumId: number;
  /** Null when "first seen" carries no signal, e.g. right after the initial import. */
  readonly firstSeenAt: string | null;
}

export interface UserPreferences {
  readonly interestWeights: ReadonlyMap<number, InterestWeight>;
  readonly excludedCategoryIds: ReadonlySet<number>;
  readonly preferredRegions: ReadonlySet<string>;
  readonly followedMuseumIds: ReadonlySet<number>;
  /** Only on the user's own pages; absent means no learned signal. */
  readonly learnedAffinity?: LearnedAffinity;
}

function saturate(net: number, max: number): number {
  return (
    Math.sign(net) * max * (1 - Math.exp(-Math.abs(net) / LEARNED_SATURATION))
  );
}

function learnedReason(
  exhibition: RelevanceExhibition,
  affinity: LearnedAffinity,
): RelevanceReason | null {
  const categoryNet = [...new Set(exhibition.categoryIds)].reduce(
    (sum, categoryId) => sum + (affinity.categories.get(categoryId) ?? 0),
    0,
  );
  const category = saturate(categoryNet, LEARNED_CATEGORY_MAX);
  const museum = saturate(
    affinity.museums.get(exhibition.museumId) ?? 0,
    LEARNED_MUSEUM_MAX,
  );
  const points = Math.max(
    -LEARNED_CAP,
    Math.min(LEARNED_CAP, category + museum),
  );
  if (points === 0) return null;
  return {
    type: "learned",
    points,
    basis: Math.abs(museum) > Math.abs(category) ? "museum" : "category",
  };
}

export function getRelevance(
  exhibition: RelevanceExhibition,
  preferences: UserPreferences,
  today: string,
): RelevanceResult {
  const reasons: RelevanceReason[] = [];

  const matches = exhibition.categoryIds
    .map((categoryId) => ({
      categoryId,
      weight: preferences.interestWeights.get(categoryId),
    }))
    .filter(
      (match): match is { categoryId: number; weight: InterestWeight } =>
        match.weight !== undefined,
    )
    .sort((a, b) => b.weight - a.weight);

  let equivalentTotal = 0;
  matches.forEach(({ categoryId, weight }, index) => {
    const nominal =
      index === 0 ? FIRST_CATEGORY_POINTS : ADDITIONAL_CATEGORY_POINTS;
    const cappedEquivalent = Math.min(CATEGORY_CAP, equivalentTotal + nominal);
    const equivalentPoints = cappedEquivalent - equivalentTotal;
    equivalentTotal = cappedEquivalent;
    const points = equivalentPoints * weight;
    if (points > 0)
      reasons.push({ type: "category", categoryId, weight, points });
  });

  if (
    exhibition.region !== null &&
    preferences.preferredRegions.has(exhibition.region)
  ) {
    reasons.push({ type: "region", points: REGION_POINTS });
  }

  if (preferences.followedMuseumIds.has(exhibition.museumId)) {
    reasons.push({ type: "museum", points: MUSEUM_POINTS });
  }

  if (
    exhibition.firstSeenAt !== null &&
    daysBetween(exhibition.firstSeenAt, today) <= NEW_WITHIN_DAYS
  ) {
    reasons.push({ type: "new", points: NEW_POINTS });
  }

  const learned = learnedReason(
    exhibition,
    preferences.learnedAffinity ?? NO_LEARNED_AFFINITY,
  );
  if (learned !== null) reasons.push(learned);

  return {
    score: reasons.reduce((sum, reason) => sum + reason.points, 0),
    reasons,
    hasExcludedMatch: exhibition.categoryIds.some((categoryId) =>
      preferences.excludedCategoryIds.has(categoryId),
    ),
  };
}
