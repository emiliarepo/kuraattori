import { describe, expect, it } from "vitest";

import { getSinulleScore, isSinulleEligible } from "./ranking";
import type { RelevanceResult } from "./relevance";

describe("isSinulleEligible", () => {
  const categoryMatch: RelevanceResult = {
    score: 40,
    reasons: [{ type: "category", categoryId: 1, weight: 1, points: 40 }],
    hasExcludedMatch: false,
  };
  const regionMatchOnly: RelevanceResult = {
    score: 20,
    reasons: [{ type: "region", points: 20 }],
    hasExcludedMatch: false,
  };

  it("requires a category match when the user has interests", () => {
    expect(
      isSinulleEligible({
        relevance: regionMatchOnly,
        status: null,
        hasInterests: true,
      }),
    ).toBe(false);
  });

  it("falls back to a region match when the user has no interests", () => {
    expect(
      isSinulleEligible({
        relevance: regionMatchOnly,
        status: null,
        hasInterests: false,
      }),
    ).toBe(true);
  });

  it("excludes hidden exhibitions", () => {
    expect(
      isSinulleEligible({
        relevance: categoryMatch,
        status: "hidden",
        hasInterests: true,
      }),
    ).toBe(false);
  });

  it("excludes visited exhibitions", () => {
    expect(
      isSinulleEligible({
        relevance: categoryMatch,
        status: "visited",
        hasInterests: true,
      }),
    ).toBe(false);
  });

  it("excludes exhibitions with no relevance", () => {
    expect(
      isSinulleEligible({
        relevance: { score: 0, reasons: [], hasExcludedMatch: false },
        status: null,
        hasInterests: false,
      }),
    ).toBe(false);
  });

  it("excludes an exhibition matching an Ei kiinnosta category", () => {
    const excludedMatch: RelevanceResult = {
      score: 40,
      reasons: [{ type: "category", categoryId: 1, weight: 1, points: 40 }],
      hasExcludedMatch: true,
    };
    expect(
      isSinulleEligible({
        relevance: excludedMatch,
        status: null,
        hasInterests: true,
      }),
    ).toBe(false);
  });

  it("keeps an Ei kiinnosta match eligible when it also matches an Erityisesti category", () => {
    const excludedButOverridden: RelevanceResult = {
      score: 80,
      reasons: [{ type: "category", categoryId: 2, weight: 2, points: 80 }],
      hasExcludedMatch: true,
    };
    expect(
      isSinulleEligible({
        relevance: excludedButOverridden,
        status: null,
        hasInterests: true,
      }),
    ).toBe(true);
  });
});

describe("getSinulleScore", () => {
  it("never lets urgency lift a weakly relevant, zero-category exhibition above a strongly relevant one", () => {
    const weakButUrgent: RelevanceResult = {
      score: 20,
      reasons: [{ type: "region", points: 20 }],
      hasExcludedMatch: false,
    };
    const stronglyRelevant: RelevanceResult = {
      score: 70,
      reasons: [
        { type: "category", categoryId: 1, weight: 1, points: 40 },
        { type: "category", categoryId: 2, weight: 1, points: 15 },
        { type: "category", categoryId: 3, weight: 1, points: 15 },
      ],
      hasExcludedMatch: false,
    };

    const weakScore = getSinulleScore({
      relevance: weakButUrgent,
      urgency: 100,
    });
    const strongScore = getSinulleScore({
      relevance: stronglyRelevant,
      urgency: 0,
    });

    expect(strongScore).toBeGreaterThan(weakScore);
  });

  it("caps urgency's contribution at 15 points", () => {
    const relevance: RelevanceResult = {
      score: 40,
      reasons: [],
      hasExcludedMatch: false,
    };
    expect(getSinulleScore({ relevance, urgency: 100 })).toBe(55);
    expect(getSinulleScore({ relevance, urgency: 1000 })).toBe(55);
  });

  it("never lets urgency boost an exhibition only included via the Ei kiinnosta override", () => {
    const excludedButOverridden: RelevanceResult = {
      score: 80,
      reasons: [{ type: "category", categoryId: 2, weight: 2, points: 80 }],
      hasExcludedMatch: true,
    };
    expect(
      getSinulleScore({ relevance: excludedButOverridden, urgency: 100 }),
    ).toBe(80);
  });
});
