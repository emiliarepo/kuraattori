import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseMuseumPage } from "./parse-museum";

const fixture = readFileSync(
  join(import.meta.dirname, "../../../../fixtures/museot/museum-21118.html"),
  "utf-8",
);

describe("parseMuseumPage", () => {
  it("reads the visit address and coordinates from a real museum page", () => {
    expect(parseMuseumPage(fixture)).toEqual({
      address: "Mannerheiminaukio 2, 00100 Helsinki",
      latitude: 60.17158,
      longitude: 24.9368,
    });
  });

  it("skips pages without a street address", () => {
    expect(
      parseMuseumPage(
        '<div class="museon_tiedot"><p>Museum<br>Turku</p></div>',
      ),
    ).toBeUndefined();
  });

  it("adds the known city when the street address has no postal code", () => {
    const withoutPostalCode = fixture.replace(
      "Mannerheiminaukio 2, 00100 Helsinki<br>",
      "Mannerheiminaukio 2<br>",
    );
    expect(parseMuseumPage(withoutPostalCode, "Helsinki")?.address).toBe(
      "Mannerheiminaukio 2, Helsinki",
    );
  });

  it("accepts a street without a number when the route confirms it", () => {
    const html = `
      <div class="museon_tiedot"><p>Museum<br>R. Erik Serlachiuksen katu, Mänttä<br></p></div>
      <input id="mh_osoite2" value="R.%20Erik%20Serlachiuksen%20katu%2C%20M%C3%A4ntt%C3%A4%3A%3A62.027452%2C24.627017">
    `;
    expect(parseMuseumPage(html, "Mänttä-Vilppula")?.address).toBe(
      "R. Erik Serlachiuksen katu, Mänttä",
    );
  });
});
