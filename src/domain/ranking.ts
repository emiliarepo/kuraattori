import type { RelevanceResult } from "./relevance";
import type { UserExhibitionStatus } from "./status";

const URGENCY_WEIGHT = 0.15;

export interface SinulleEligibilityInput {
  readonly relevance: RelevanceResult;
  readonly status: UserExhibitionStatus | null;
  readonly hasInterests: boolean;
}

/**
 * With interests set, eligibility requires a matching category (urgency alone
 * cannot qualify an exhibition). Without interests, it falls back to region.
 */
export function isSinulleEligible(input: SinulleEligibilityInput): boolean {
  if (input.status === "hidden" || input.status === "visited") return false;
  if (input.relevance.score <= 0) return false;

  if (input.hasInterests) {
    return input.relevance.reasons.some((reason) => reason.type === "category");
  }
  return input.relevance.reasons.some((reason) => reason.type === "region");
}

/** `relevance + min(urgency, 100) * 0.15` — urgency is a tiebreaker, worth at most 15 points. */
export function getSinulleScore(input: {
  readonly relevance: RelevanceResult;
  readonly urgency: number;
}): number {
  return input.relevance.score + Math.min(input.urgency, 100) * URGENCY_WEIGHT;
}
