import { describe, expect, it } from "vitest";

import { getRelevance, type UserPreferences } from "./relevance";

const today = "2026-09-27";

const noPreferences: UserPreferences = {
  interestWeights: new Map(),
  excludedCategoryIds: new Set(),
  preferredRegions: new Set(),
  followedMuseumIds: new Set(),
};

describe("getRelevance", () => {
  it("scores the first matching category at 40 for a Kiinnostaa (weight 1) interest", () => {
    const result = getRelevance(
      {
        categoryIds: [1],
        region: null,
        museumId: 1,
        firstSeenAt: "2020-01-01",
      },
      { ...noPreferences, interestWeights: new Map([[1, 1]]) },
      today,
    );
    expect(result.score).toBe(40);
    expect(result.reasons).toEqual([
      { type: "category", categoryId: 1, weight: 1, points: 40 },
    ]);
    expect(result.hasExcludedMatch).toBe(false);
  });

  it("caps the category contribution at 70 regardless of how many match", () => {
    const result = getRelevance(
      {
        categoryIds: [1, 2, 3, 4],
        region: null,
        museumId: 1,
        firstSeenAt: "2020-01-01",
      },
      {
        ...noPreferences,
        interestWeights: new Map([
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
        ]),
      },
      today,
    );
    expect(result.score).toBe(70);
    expect(result.reasons.map((r) => r.points)).toEqual([40, 15, 15]);
  });

  it("doubles the points for an Erityisesti (weight 2) interest", () => {
    const result = getRelevance(
      {
        categoryIds: [1],
        region: null,
        museumId: 1,
        firstSeenAt: "2020-01-01",
      },
      { ...noPreferences, interestWeights: new Map([[1, 2]]) },
      today,
    );
    expect(result.score).toBe(80);
    expect(result.reasons).toEqual([
      { type: "category", categoryId: 1, weight: 2, points: 80 },
    ]);
  });

  it("prioritises the strongest-weighted category for the first-match bonus", () => {
    const result = getRelevance(
      {
        categoryIds: [1, 2],
        region: null,
        museumId: 1,
        firstSeenAt: "2020-01-01",
      },
      {
        ...noPreferences,
        interestWeights: new Map([
          [1, 1],
          [2, 2],
        ]),
      },
      today,
    );
    // category 2 (weight 2) takes the 40-nominal slot (80 pts); category 1
    // (weight 1) takes the 15-nominal slot (15 pts).
    expect(result.reasons).toEqual([
      { type: "category", categoryId: 2, weight: 2, points: 80 },
      { type: "category", categoryId: 1, weight: 1, points: 15 },
    ]);
    expect(result.score).toBe(95);
  });

  it("flags a category the user marked Ei kiinnosta without scoring it", () => {
    const result = getRelevance(
      {
        categoryIds: [1],
        region: null,
        museumId: 1,
        firstSeenAt: "2020-01-01",
      },
      { ...noPreferences, excludedCategoryIds: new Set([1]) },
      today,
    );
    expect(result).toEqual({ score: 0, reasons: [], hasExcludedMatch: true });
  });

  it("adds a region reason for a preferred region", () => {
    const result = getRelevance(
      {
        categoryIds: [],
        region: "Tampere",
        museumId: 1,
        firstSeenAt: "2020-01-01",
      },
      { ...noPreferences, preferredRegions: new Set(["Tampere"]) },
      today,
    );
    expect(result).toEqual({
      score: 20,
      reasons: [{ type: "region", points: 20 }],
      hasExcludedMatch: false,
    });
  });

  it("adds a museum reason for a followed museum", () => {
    const result = getRelevance(
      { categoryIds: [], region: null, museumId: 7, firstSeenAt: "2020-01-01" },
      { ...noPreferences, followedMuseumIds: new Set([7]) },
      today,
    );
    expect(result).toEqual({
      score: 15,
      reasons: [{ type: "museum", points: 15 }],
      hasExcludedMatch: false,
    });
  });

  it("adds a recency reason when first seen within 14 days", () => {
    const result = getRelevance(
      { categoryIds: [], region: null, museumId: 1, firstSeenAt: "2026-09-20" },
      noPreferences,
      today,
    );
    expect(result).toEqual({
      score: 10,
      reasons: [{ type: "new", points: 10 }],
      hasExcludedMatch: false,
    });
  });

  it("does not add a recency reason once older than 14 days", () => {
    const result = getRelevance(
      { categoryIds: [], region: null, museumId: 1, firstSeenAt: "2026-09-01" },
      noPreferences,
      today,
    );
    expect(result).toEqual({
      score: 0,
      reasons: [],
      hasExcludedMatch: false,
    });
  });

  it("does not add a recency reason when firstSeenAt is null (initial import)", () => {
    const result = getRelevance(
      { categoryIds: [], region: null, museumId: 1, firstSeenAt: null },
      noPreferences,
      today,
    );
    expect(result).toEqual({
      score: 0,
      reasons: [],
      hasExcludedMatch: false,
    });
  });
});
