import { describe, expect, it } from "vitest";

import { getRelevance, type UserPreferences } from "./relevance";

const today = "2026-09-27";

const noPreferences: UserPreferences = {
  interestCategoryIds: new Set(),
  preferredRegions: new Set(),
  followedMuseumIds: new Set(),
};

describe("getRelevance", () => {
  it("scores the first matching category at 40", () => {
    const result = getRelevance(
      {
        categoryIds: [1],
        region: null,
        museumId: 1,
        firstSeenAt: "2020-01-01",
      },
      { ...noPreferences, interestCategoryIds: new Set([1]) },
      today,
    );
    expect(result.score).toBe(40);
    expect(result.reasons).toEqual([
      { type: "category", categoryId: 1, points: 40 },
    ]);
  });

  it("caps the category contribution at 70 regardless of how many match", () => {
    const result = getRelevance(
      {
        categoryIds: [1, 2, 3, 4],
        region: null,
        museumId: 1,
        firstSeenAt: "2020-01-01",
      },
      { ...noPreferences, interestCategoryIds: new Set([1, 2, 3, 4]) },
      today,
    );
    expect(result.score).toBe(70);
    expect(result.reasons.map((r) => r.points)).toEqual([40, 15, 15]);
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
    });
  });

  it("does not add a recency reason once older than 14 days", () => {
    const result = getRelevance(
      { categoryIds: [], region: null, museumId: 1, firstSeenAt: "2026-09-01" },
      noPreferences,
      today,
    );
    expect(result).toEqual({ score: 0, reasons: [] });
  });

  it("does not add a recency reason when firstSeenAt is null (initial import)", () => {
    const result = getRelevance(
      { categoryIds: [], region: null, museumId: 1, firstSeenAt: null },
      noPreferences,
      today,
    );
    expect(result).toEqual({ score: 0, reasons: [] });
  });
});
