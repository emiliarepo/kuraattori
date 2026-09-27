import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseListingPage } from "./parse-listing";
import {
  collectTranslations,
  distinctTranslation,
  hashTranslations,
  parseTranslatedDetail,
  parseTranslatedListing,
  translatedDetailPath,
  type TranslationLocale,
} from "./translations";

const fixture = (name: string) =>
  readFileSync(
    join(import.meta.dirname, "../../../../fixtures/museot", name),
    "utf-8",
  );

const finnish = parseListingPage(fixture("listing-all.html"));
const listings = {
  en: parseTranslatedListing(fixture("listing-all-en.html")),
  sv: parseTranslatedListing(fixture("listing-all-sv.html")),
};
const item = (sourceId: string) =>
  finnish.items.find((candidate) => candidate.sourceId === sourceId)!;

describe("parseTranslatedListing", () => {
  it("reads translated titles, museum names and topic names", () => {
    expect(listings.en.items.get("42095")).toMatchObject({
      title: "Moomin Mug Mania",
      museumName: "Moomin Museum",
    });
    expect(listings.sv.items.get("42095")?.title).toBe("Muminmuggmani");
    expect(listings.en.topics.get("73")).toBe("Design and architecture");
    expect(listings.sv.topics.get("73")).toBe("Design och arkitektur");
  });

  it("keeps rows whose museum has no translated name", () => {
    const blankMuseums = [...listings.en.items.values()].filter(
      (row) => row.museumName === "",
    );
    expect(blankMuseums.length).toBeGreaterThan(0);
  });
});

describe("parseTranslatedDetail", () => {
  it("reads the English and Swedish description", () => {
    expect(
      parseTranslatedDetail(fixture("detail-41732-en.html")).description,
    ).toMatch(/^Lullabies, traditional songs, and voodoo melodies/);
    expect(
      parseTranslatedDetail(fixture("detail-41732-sv.html")).description,
    ).toMatch(/^Installationen består av 16 ljudkanaler/);
  });

  it("returns the Finnish text museot.fi shows when there is no translation", () => {
    expect(
      parseTranslatedDetail(fixture("detail-44941-en.html")).description,
    ).toMatch(/^Ryynäsen yli 30-vuotisella/);
  });
});

describe("distinctTranslation", () => {
  it("drops empty, whitespace-only and Finnish-repeating values", () => {
    expect(distinctTranslation("  ", "Mökillä")).toBeUndefined();
    expect(distinctTranslation("Mökillä ", "Mökillä")).toBeUndefined();
    expect(distinctTranslation(undefined, "Mökillä")).toBeUndefined();
    expect(distinctTranslation(" At the Summer Cabin", "Mökillä")).toBe(
      "At the Summer Cabin",
    );
  });
});

describe("collectTranslations", () => {
  const fetchFixture = (locale: TranslationLocale, sourceId: string) =>
    Promise.resolve(fixture(`detail-${sourceId}-${locale}.html`));

  it("stores translated titles and fetches only pages with translated text", async () => {
    const requested: string[] = [];
    const run = await collectTranslations(
      [item("41732"), item("44918")],
      listings,
      new Map(),
      (locale, sourceId) => {
        requested.push(translatedDetailPath(locale, sourceId));
        return fetchFixture(locale, sourceId);
      },
    );
    expect(requested).toEqual([
      "/exhibitions/index.php?nayttely_id=41732",
      "/utstallningar/index.php?nayttely_id=41732",
    ]);
    const [kiasma, untranslated] = run.translations;
    expect(kiasma?.en.description).toMatch(/^Lullabies/);
    expect(kiasma?.en.title).toBe("Oliver Beer – Resonance Project: The Cave");
    expect(kiasma?.en.museumName).toBe("Museum of Contemporary Art Kiasma");
    expect(untranslated?.en.title).toBeUndefined();
    expect(untranslated?.sv.title).toBeUndefined();
    expect(run.requests).toBe(2);
  });

  it("skips exhibitions whose translated rows haven't changed", async () => {
    const known = new Map([
      [
        "41732",
        hashTranslations({
          en: listings.en.items.get("41732"),
          sv: listings.sv.items.get("41732"),
        }),
      ],
    ]);
    const run = await collectTranslations(
      [item("41732")],
      listings,
      known,
      () => Promise.reject(new Error("must not fetch")),
    );
    expect(run).toEqual({ translations: [], failed: 0, requests: 0 });
  });

  it("counts a failed page and leaves the exhibition for the next run", async () => {
    const run = await collectTranslations(
      [item("41732")],
      listings,
      new Map(),
      () => Promise.reject(new Error("503")),
    );
    expect(run.translations).toEqual([]);
    expect(run.failed).toBe(1);
  });
});
