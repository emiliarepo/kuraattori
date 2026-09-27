import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { classify, computeExhibitionGroup, isNoticeTitle } from "./grouping";
import {
  parseListingPage,
  type RawListingItem,
} from "./museot-fi/parse-listing";

const fixturesDir = join(import.meta.dirname, "../../../fixtures/museot");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

function findItem(
  items: RawListingItem[],
  title: string,
  museumName: string,
): RawListingItem {
  const item = items.find(
    (i) => i.title === title && i.museumName === museumName,
  );
  if (!item)
    throw new Error(`fixture item not found: ${title} / ${museumName}`);
  return item;
}

describe("computeExhibitionGroup", () => {
  const { items } = parseListingPage(readFixture("listing-all.html"));

  it("groups the same exhibition listed at two venues", () => {
    const oulunMuseo = findItem(items, "Metallikausi", "Oulun museo");
    const tiima = findItem(items, "Metallikausi", "Tiima");

    const groupA = computeExhibitionGroup({
      title: oulunMuseo.title,
      startDate: oulunMuseo.startDate,
      endDate: oulunMuseo.endDate,
      description: oulunMuseo.excerpt,
    });
    const groupB = computeExhibitionGroup({
      title: tiima.title,
      startDate: tiima.startDate,
      endDate: tiima.endDate,
      description: tiima.excerpt,
    });

    expect(groupA).toBe(groupB);
  });

  it("doesn't group unrelated exhibitions that share a title but nothing else", () => {
    const merenkulkumuseo = findItem(
      items,
      "Perusnäyttely",
      "Ahvenanmaan merenkulkumuseo",
    );
    const lasimuseo = findItem(items, "Perusnäyttely", "Suomen lasimuseo");

    const groupA = computeExhibitionGroup({
      title: merenkulkumuseo.title,
      startDate: merenkulkumuseo.startDate,
      endDate: merenkulkumuseo.endDate,
      description: merenkulkumuseo.excerpt,
    });
    const groupB = computeExhibitionGroup({
      title: lasimuseo.title,
      startDate: lasimuseo.startDate,
      endDate: lasimuseo.endDate,
      description: lasimuseo.excerpt,
    });

    expect(groupA).not.toBe(groupB);
  });

  it("doesn't group same-title exhibitions with different dates", () => {
    const oulunMuseo = findItem(items, "Metallikausi", "Oulun museo");

    const groupA = computeExhibitionGroup({
      title: oulunMuseo.title,
      startDate: oulunMuseo.startDate,
      endDate: oulunMuseo.endDate,
      description: oulunMuseo.excerpt,
    });
    const groupB = computeExhibitionGroup({
      title: oulunMuseo.title,
      startDate: "2099-01-01",
      endDate: oulunMuseo.endDate,
      description: oulunMuseo.excerpt,
    });

    expect(groupA).not.toBe(groupB);
  });
});

describe("isNoticeTitle", () => {
  const { items } = parseListingPage(readFixture("listing-all.html"));

  it("matches real closure-notice titles from the feed", () => {
    const notices = items.filter(
      (item) => item.title === "suljettu näyttelyn vaihdon ajan",
    );
    expect(notices.length).toBeGreaterThan(0);
    for (const notice of notices)
      expect(isNoticeTitle(notice.title)).toBe(true);
  });

  it("doesn't flag a real exhibition whose excerpt merely mentions a closure", () => {
    const pelimuseo = findItem(
      items,
      "Suomen pelimuseo",
      "Museokeskus Vapriikki",
    );
    expect(pelimuseo.excerpt).toContain("suljettu");
    expect(isNoticeTitle(pelimuseo.title)).toBe(false);
  });
});

describe("classify", () => {
  it("sets kind to notice for a closure listing and exhibition otherwise", () => {
    expect(
      classify({
        title: "suljettu näyttelyn vaihdon ajan",
        startDate: "2026-10-05",
        endDate: "2026-10-17",
        description: undefined,
      }).kind,
    ).toBe("notice");
    expect(
      classify({
        title: "Metallikausi",
        startDate: "2026-10-09",
        endDate: "2028-10-28",
        description: "text",
      }).kind,
    ).toBe("exhibition");
  });
});
