import { describe, expect, it } from "vitest";

import { summarizeSavings, type SavingsVisit } from "./savings";

const visit = (overrides: Partial<SavingsVisit>): SavingsVisit => ({
  title: "Näyttely",
  visitedAt: new Date("2026-05-10T10:00:00Z"),
  museumCardEligible: true,
  admissionAdultCents: 1500,
  ...overrides,
});

describe("summarizeSavings", () => {
  it("returns undefined without dated visits", () => {
    expect(summarizeSavings([], undefined)).toBeUndefined();
    expect(
      summarizeSavings([visit({ visitedAt: null })], undefined),
    ).toBeUndefined();
  });

  it("sums priced card-eligible visits and lists unpriced ones", () => {
    expect(
      summarizeSavings(
        [
          visit({ admissionAdultCents: 2300 }),
          visit({ admissionAdultCents: 1350 }),
          visit({ title: "Hinnaton", admissionAdultCents: null }),
          visit({ museumCardEligible: false, admissionAdultCents: 1000 }),
        ],
        undefined,
      ),
    ).toEqual({
      year: 2026,
      years: [2026],
      savedCents: 3650,
      unpricedTitles: ["Hinnaton"],
    });
  });

  it("defaults to the latest year and honours a requested one", () => {
    const visits = [
      visit({ visitedAt: new Date("2025-12-31T22:30:00Z") }),
      visit({
        visitedAt: new Date("2025-06-01T10:00:00Z"),
        admissionAdultCents: 800,
      }),
    ];
    expect(summarizeSavings(visits, undefined)).toMatchObject({
      year: 2026,
      years: [2026, 2025],
      savedCents: 1500,
    });
    expect(summarizeSavings(visits, 2025)?.savedCents).toBe(800);
    expect(summarizeSavings(visits, 2019)?.year).toBe(2026);
  });
});
