import { describe, expect, it } from "vitest";

import { learnAffinity, type RatedVisit } from "./learned-affinity";
import { isSinulleEligible } from "./ranking";
import {
  getRelevance,
  type RelevanceExhibition,
  type UserPreferences,
} from "./relevance";

const today = "2026-09-27";
const NYKYTAIDE = 1;
const KIASMA = 10;

const noPreferences: UserPreferences = {
  interestWeights: new Map(),
  excludedCategoryIds: new Set(),
  preferredRegions: new Set(),
  followedMuseumIds: new Set(),
};

const candidate: RelevanceExhibition = {
  categoryIds: [NYKYTAIDE],
  region: null,
  museumId: KIASMA,
  firstSeenAt: null,
};

function visits(
  count: number,
  rating: RatedVisit["rating"] = "up",
  visitedAt: string | null = today,
): RatedVisit[] {
  return Array.from({ length: count }, () => ({
    categoryIds: [NYKYTAIDE],
    museumId: KIASMA,
    rating,
    visitedAt,
  }));
}

function learnedPoints(
  rated: readonly RatedVisit[],
  exhibition = candidate,
): number {
  const reason = getRelevance(
    exhibition,
    { ...noPreferences, learnedAffinity: learnAffinity(rated, today) },
    today,
  ).reasons.find((r) => r.type === "learned");
  return reason?.points ?? 0;
}

describe("learned affinity from visit ratings", () => {
  it("gives a single 👍 only a small effect", () => {
    const points = learnedPoints(visits(1));
    expect(points).toBeGreaterThan(0);
    expect(points).toBeLessThan(5);
  });

  it("saturates: each extra 👍 adds less than the one before", () => {
    const [one, two, three] = [1, 2, 3].map((n) => learnedPoints(visits(n)));
    expect(two! - one!).toBeLessThan(one!);
    expect(three! - two!).toBeLessThan(two! - one!);
  });

  it("caps at 12, below one Kiinnostaa category, a region and a followed museum", () => {
    const points = learnedPoints(visits(100));
    expect(points).toBe(12);
    const kiinnostaa = getRelevance(
      { ...candidate, museumId: 99 },
      { ...noPreferences, interestWeights: new Map([[NYKYTAIDE, 1]]) },
      today,
    ).score;
    expect(points).toBeLessThan(kiinnostaa);
    expect(points).toBeLessThan(15);
  });

  it("reorders close candidates", () => {
    const preferences: UserPreferences = {
      ...noPreferences,
      interestWeights: new Map([
        [NYKYTAIDE, 1],
        [2, 1],
      ]),
      learnedAffinity: learnAffinity(visits(2), today),
    };
    const liked = getRelevance(candidate, preferences, today).score;
    const other = getRelevance(
      { ...candidate, categoryIds: [2], museumId: 99 },
      preferences,
      today,
    ).score;
    expect(liked).toBeGreaterThan(other);
  });

  it("lowers the score after 👎, symmetrically", () => {
    expect(learnedPoints(visits(2, "down"))).toBeCloseTo(
      -learnedPoints(visits(2)),
    );
    expect(learnedPoints(visits(100, "down"))).toBe(-12);
  });

  it("halves an old rating's weight per year", () => {
    const fresh = learnAffinity(visits(1), today).categories.get(NYKYTAIDE);
    const yearOld = learnAffinity(
      visits(1, "up", "2025-09-27"),
      today,
    ).categories.get(NYKYTAIDE);
    expect(yearOld).toBeCloseTo(fresh! / 2, 2);
  });

  it("leaves Ei kiinnosta in charge: a strong liking never makes it eligible", () => {
    const relevance = getRelevance(
      candidate,
      {
        ...noPreferences,
        interestWeights: new Map([[2, 1]]),
        excludedCategoryIds: new Set([NYKYTAIDE]),
        learnedAffinity: learnAffinity(visits(100), today),
      },
      today,
    );
    expect(relevance.score).toBeGreaterThan(0);
    expect(
      isSinulleEligible({ relevance, status: null, hasInterests: true }),
    ).toBe(false);
  });

  it("adds a reason naming what contributed more, and none without ratings", () => {
    const rated = learnAffinity(visits(2), today);
    const byCategory = getRelevance(
      { ...candidate, museumId: 99 },
      { ...noPreferences, learnedAffinity: rated },
      today,
    ).reasons;
    expect(byCategory).toEqual([
      expect.objectContaining({ type: "learned", basis: "category" }),
    ]);
    const byMuseum = getRelevance(
      { ...candidate, categoryIds: [3] },
      { ...noPreferences, learnedAffinity: rated },
      today,
    ).reasons;
    expect(byMuseum).toEqual([
      expect.objectContaining({ type: "learned", basis: "museum" }),
    ]);
    expect(getRelevance(candidate, noPreferences, today).reasons).toEqual([]);
  });
});
