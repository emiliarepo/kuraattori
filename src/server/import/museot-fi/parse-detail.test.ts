import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseDetailPage } from "./parse-detail";

const fixturePath = join(
  import.meta.dirname,
  "../../../../fixtures/museot/detail-41732.html",
);

describe("parseDetailPage", () => {
  const detail = parseDetailPage(readFileSync(fixturePath, "utf-8"));

  it("parses the title, museum and dates", () => {
    expect(detail).toMatchObject({
      title: "Oliver Beer – Resonance Project: The Cave",
      museumSourceId: "21118",
      museumName: "Nykytaiteen museo Kiasma",
      city: "Helsinki",
      startDate: "2026-11-06",
      endDate: "2027-03-28",
    });
  });

  it("joins the description paragraphs and excludes the share-box text", () => {
    expect(detail?.description).toContain("esihistoriallisessa luolassa");
    expect(detail?.description).not.toContain("Kerro tästä myös ystävillesi");
  });

  it("detects Museum Card eligibility from the entrance marker", () => {
    expect(detail?.museumCardEligible).toBe(true);
  });

  it("extracts the exhibition's themes with their topic ids", () => {
    expect(detail?.categorySourceIds).toEqual(["71", "63"]);
  });

  it("resolves the absolute detail image URL", () => {
    expect(detail?.imageUrl).toBe(
      "https://museot.fi/uploadkuvat/museot/21118/Exhibition-view_Resonance-Project_The-Cave_Lyon-Biennale2024--Oliver-Beer.jpg",
    );
  });

  it("returns undefined for a page missing the required fields", () => {
    expect(
      parseDetailPage("<html><body>Not a valid detail page</body></html>"),
    ).toBeUndefined();
  });

  it("treats a missing entrance marker as not Museum Card eligible", () => {
    const html = `
      <h1>Test exhibition</h1>
      <p class="paikka"><a href="/museohaku/index.php?museo_id=1">Test museum</a>, Turku</p>
      <div class="paivat"><ul><li class="ajankohta">1.1.2026&#8211;2.2.2026</li></ul></div>`;
    const detailWithoutCard = parseDetailPage(html);
    expect(detailWithoutCard?.museumCardEligible).toBe(false);
  });
});
