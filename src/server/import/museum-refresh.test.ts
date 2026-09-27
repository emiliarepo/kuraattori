import { describe, expect, it } from "vitest";

import { selectMuseumsForPageFetch } from "./museum-refresh";

const now = new Date("2026-09-27T01:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe("selectMuseumsForPageFetch", () => {
  it("fetches new and changed museums right away", () => {
    const picked = selectMuseumsForPageFetch(
      [
        { sourceId: "new", pageFetchedAt: null },
        { sourceId: "changed", pageFetchedAt: daysAgo(1) },
        { sourceId: "fresh", pageFetchedAt: daysAgo(1) },
      ],
      new Set(["changed"]),
      now,
    );
    expect(picked.map((m) => m.sourceId)).toEqual(["new", "changed"]);
  });

  it("refreshes the stalest week-old pages, a seventh of museums per night", () => {
    const museums = Array.from({ length: 14 }, (_, i) => ({
      sourceId: `m${i}`,
      pageFetchedAt: daysAgo(i < 10 ? 7 + i : 3),
    }));
    const picked = selectMuseumsForPageFetch(museums, new Set(), now);
    expect(picked.map((m) => m.sourceId)).toEqual(["m9", "m8"]);
  });

  it("converges to one seventh per night after everything was fetched at once", () => {
    let museums = Array.from({ length: 70 }, (_, i) => ({
      sourceId: `m${i}`,
      pageFetchedAt: now,
    }));
    const perNight: number[] = [];
    for (let night = 1; night <= 21; night++) {
      const today = new Date(now.getTime() + night * 86_400_000);
      const picked = new Set(
        selectMuseumsForPageFetch(museums, new Set(), today).map(
          (m) => m.sourceId,
        ),
      );
      perNight.push(picked.size);
      museums = museums.map((m) =>
        picked.has(m.sourceId) ? { ...m, pageFetchedAt: today } : m,
      );
    }
    expect(Math.max(...perNight)).toBe(10);
    expect(perNight.slice(14)).toEqual([10, 10, 10, 10, 10, 10, 10]);
  });
});
