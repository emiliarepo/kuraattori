import { describe, expect, it } from "vitest";

import { getSinulleScore, isSinulleEligible } from "./ranking";
import type { RelevanceResult } from "./relevance";

describe("isSinulleEligible", () => {
  const categoryMatch: RelevanceResult = {
    score: 40,
    reasons: [{ type: "category", categoryId: 1, points: 40 }],
  };
  const regionMatchOnly: RelevanceResult = {
    score: 20,
    reasons: [{ type: "region", points: 20 }],
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
        relevance: { score: 0, reasons: [] },
        status: null,
        hasInterests: false,
      }),
    ).toBe(false);
  });
});

describe("getSinulleScore", () => {
  it("never lets urgency lift a weakly relevant, zero-category exhibition above a strongly relevant one", () => {
    const weakButUrgent: RelevanceResult = {
      score: 20,
      reasons: [{ type: "region", points: 20 }],
    };
    const stronglyRelevant: RelevanceResult = {
      score: 70,
      reasons: [
        { type: "category", categoryId: 1, points: 40 },
        { type: "category", categoryId: 2, points: 15 },
        { type: "category", categoryId: 3, points: 15 },
      ],
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
    const relevance: RelevanceResult = { score: 40, reasons: [] };
    expect(getSinulleScore({ relevance, urgency: 100 })).toBe(55);
    expect(getSinulleScore({ relevance, urgency: 1000 })).toBe(55);
  });
});
