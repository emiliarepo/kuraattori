import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseListingItem, parseListingPage } from "./parse-listing";
import { parse } from "node-html-parser";

const fixturesDir = join(import.meta.dirname, "../../../../fixtures/museot");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("parseListingPage", () => {
  it("parses every exhibition in the full listing, with no failures", () => {
    const result = parseListingPage(readFixture("listing-all.html"));
    expect(result.items).toHaveLength(640);
    expect(result.failedCount).toBe(0);
  });

  it("decodes HTML entities and resolves a relative image URL", () => {
    const result = parseListingPage(readFixture("listing-all.html"));
    const first = result.items[0];
    expect(first).toMatchObject({
      sourceId: "44940",
      title: "SYNERGY ART FEST",
      museumName: "Tekniikan museo",
      city: "Helsinki",
      startDate: "2026-10-01",
      endDate: "2026-10-20",
    });
    expect(first?.excerpt).toContain("–20.10.2026"); // en dash entity decoded
    expect(first?.imageUrl).toBe(
      "https://museot.fi/uploadkuvat/museot/21136/Flyer-FacebookBanner.jpg",
    );
  });

  it("parses an open-ended date range with no end date", () => {
    const result = parseListingPage(readFixture("listing-all.html"));
    const openEnded = result.items.find((item) => item.sourceId === "44916");
    expect(openEnded).toMatchObject({
      startDate: "2026-11-28",
      endDate: undefined,
    });
  });

  it("extracts the topic and maakunta taxonomies from the checkbox/select lists", () => {
    const result = parseListingPage(readFixture("listing-all.html"));
    expect(result.taxonomy.topics).toContainEqual({
      sourceId: "63",
      name: "Taide",
    });
    expect(result.taxonomy.topics).toContainEqual({
      sourceId: "71",
      name: "Nykytaide",
    });
    expect(result.taxonomy.maakuntas).toContainEqual({
      id: "1",
      name: "Uusimaa",
    });
    expect(result.taxonomy.maakuntas.length).toBeGreaterThan(15);
  });

  it("counts one malformed row as failed without dropping the rest", () => {
    const html = `
      <ul>
        <li id="li1">
          <a class="normaali" href="/nayttelykalenteri/index.php?nayttely_id=1">
            <div class="kuva cover" data-x-bg-src="../uploadkuvat/a.jpg"></div>
            <div class="tekstit">
              <h2>Good exhibition</h2>
              An excerpt.<br>
              <p class="paikka">Some museum, <span class="kunta">Helsinki</span></p>
              <p class="ajankohta">1.1.2026 &#8211; 2.2.2026</p>
            </div>
          </a>
        </li>
        <li id="li2">
          <a class="normaali" href="/nayttelykalenteri/index.php?nayttely_id=2">
            <div class="tekstit">
              <h2>Missing dates and place</h2>
              No paikka or ajankohta here.
            </div>
          </a>
        </li>
      </ul>`;
    const result = parseListingPage(html);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.sourceId).toBe("1");
    expect(result.failedCount).toBe(1);
  });
});

describe("parseListingItem", () => {
  it("returns undefined for a li missing a nayttely_id link", () => {
    const li = parse(
      '<li id="li1"><div class="tekstit"><h2>No link</h2></div></li>',
    ).querySelector("li");
    expect(li && parseListingItem(li)).toBeUndefined();
  });
});
