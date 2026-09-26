import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseDetailPage } from "./parse-detail";
import { parseListingPage } from "./parse-listing";

const fixturesDir = join(import.meta.dirname, "../../../../fixtures/museot");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

/** The import adapter derives category membership from per-topic listing fetches, not the detail page. */
describe("topic membership", () => {
  it("puts exhibition 41732 in both topic_63 (Taide) and topic_71 (Nykytaide)", () => {
    const topic63 = parseListingPage(readFixture("listing-topic-63.html"));
    const topic71 = parseListingPage(readFixture("listing-topic-71.html"));

    const inTopic63 = topic63.items.some((item) => item.sourceId === "41732");
    const inTopic71 = topic71.items.some((item) => item.sourceId === "41732");

    expect(inTopic63).toBe(true);
    expect(inTopic71).toBe(true);
  });

  it("agrees with the exhibition's own detail-page themes", () => {
    const topic63 = parseListingPage(readFixture("listing-topic-63.html"));
    const topic71 = parseListingPage(readFixture("listing-topic-71.html"));
    const detail = parseDetailPage(readFixture("detail-41732.html"));

    const membership = new Set<string>();
    if (topic63.items.some((item) => item.sourceId === "41732"))
      membership.add("63");
    if (topic71.items.some((item) => item.sourceId === "41732"))
      membership.add("71");

    expect([...membership].sort()).toEqual(
      [...(detail?.categorySourceIds ?? [])].sort(),
    );
  });

  it("excludes an exhibition that isn't a member of the topic", () => {
    const topic71 = parseListingPage(readFixture("listing-topic-71.html"));
    // 38192 ("Uudisasukkaat") is in the full listing but not in the Nykytaide topic fixture.
    expect(topic71.items.some((item) => item.sourceId === "38192")).toBe(false);
  });
});
