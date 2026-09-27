import { describe, expect, it } from "vitest";

import { summarizeYear, type YearReviewVisit } from "./year-review";

const visit = (overrides: Partial<YearReviewVisit>): YearReviewVisit => ({
  title: "Näyttely",
  museumId: 1,
  museumName: "Museo",
  city: "Helsinki",
  visitedAt: new Date("2026-05-10T10:00:00Z"),
  categories: ["Taide"],
  ...overrides,
});

describe("summarizeYear", () => {
  it("returns undefined without visits", () => {
    expect(summarizeYear([], undefined)).toBeUndefined();
  });

  it("summarises counts, categories and month spread for the year", () => {
    const result = summarizeYear(
      [
        visit({
          museumId: 1,
          city: "Helsinki",
          categories: ["Taide", "Historia"],
          visitedAt: new Date("2026-01-15T10:00:00Z"),
        }),
        visit({
          museumId: 1,
          city: "Helsinki",
          categories: ["Taide"],
          visitedAt: new Date("2026-01-20T10:00:00Z"),
        }),
        visit({
          museumId: 2,
          city: "Turku",
          categories: ["Taide"],
          visitedAt: new Date("2026-07-01T10:00:00Z"),
        }),
      ],
      undefined,
    );
    expect(result).toMatchObject({
      year: 2026,
      years: [2026],
      visitCount: 3,
      museumCount: 2,
      cityCount: 2,
      topCategories: [
        { name: "Taide", count: 3 },
        { name: "Historia", count: 1 },
      ],
      busiestMonth: { month: 1, count: 2 },
    });
    expect(result?.months).toHaveLength(12);
    expect(result?.months[0]).toEqual({ month: 1, count: 2 });
    expect(result?.months[6]).toEqual({ month: 7, count: 1 });
  });

  it("treats a single visit as both the first and latest", () => {
    const only = visit({
      title: "Ainoa",
      visitedAt: new Date("2026-03-01T10:00:00Z"),
    });
    const result = summarizeYear([only], undefined);
    expect(result?.firstVisit).toEqual({
      title: "Ainoa",
      museumName: "Museo",
      visitedAt: only.visitedAt,
    });
    expect(result?.latestVisit).toEqual(result?.firstVisit);
  });

  it("defaults to the latest year and honours a requested one", () => {
    const visits = [
      visit({ visitedAt: new Date("2025-06-01T10:00:00Z"), museumId: 9 }),
      visit({ visitedAt: new Date("2026-01-01T10:00:00Z"), museumId: 1 }),
    ];
    expect(summarizeYear(visits, undefined)?.year).toBe(2026);
    expect(summarizeYear(visits, 2025)?.year).toBe(2025);
    expect(summarizeYear(visits, 2025)?.visitCount).toBe(1);
    expect(summarizeYear(visits, 2019)?.year).toBe(2026);
  });

  it("excludes visits with no city from the city count", () => {
    const result = summarizeYear(
      [visit({ city: null }), visit({ city: "Turku", museumId: 2 })],
      undefined,
    );
    expect(result?.cityCount).toBe(1);
  });
});
