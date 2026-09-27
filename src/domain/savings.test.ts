import { describe, expect, it } from "vitest";

import { summarizeSavings, type SavingsVisit } from "./savings";

const visit = (overrides: Partial<SavingsVisit>): SavingsVisit => ({
  title: "Näyttely",
  visitedAt: new Date("2026-05-10T10:00:00Z"),
  museumCardEligible: true,
  admissionAdultCents: 1500,
  museumId: 1,
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
          visit({ admissionAdultCents: 2300, museumId: 1 }),
          visit({ admissionAdultCents: 1350, museumId: 2 }),
          visit({ title: "Hinnaton", admissionAdultCents: null, museumId: 3 }),
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

  it("counts one ticket per museum per day, at the dearest price", () => {
    const morning = new Date("2026-05-10T07:00:00Z");
    const evening = new Date("2026-05-10T20:30:00Z");
    expect(
      summarizeSavings(
        [
          visit({ visitedAt: morning, admissionAdultCents: 1500 }),
          visit({ visitedAt: evening, admissionAdultCents: 2000 }),
          visit({ visitedAt: morning, museumId: 2, admissionAdultCents: 1200 }),
          visit({
            visitedAt: new Date("2026-05-11T09:00:00Z"),
            admissionAdultCents: 1500,
          }),
        ],
        undefined,
      )?.savedCents,
    ).toBe(2000 + 1200 + 1500);
  });

  it("splits days at Helsinki midnight, not UTC", () => {
    expect(
      summarizeSavings(
        [
          visit({ visitedAt: new Date("2026-05-10T20:30:00Z") }),
          visit({ visitedAt: new Date("2026-05-10T21:30:00Z") }),
        ],
        undefined,
      )?.savedCents,
    ).toBe(3000);
  });

  it("prices a shared ticket from any priced exhibition in it", () => {
    const savings = summarizeSavings(
      [
        visit({ title: "Hinnaton", admissionAdultCents: null }),
        visit({ admissionAdultCents: 1800 }),
      ],
      undefined,
    );
    expect(savings?.savedCents).toBe(1800);
    expect(savings?.unpricedTitles).toEqual([]);
  });
});
