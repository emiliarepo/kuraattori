import { describe, expect, it } from "vitest";

import { groupRegions, resolveRegion } from "./regions";

describe("resolveRegion", () => {
  const maakuntaByCity = new Map([
    ["Sodankylä", "Lappi"],
    ["Raisio", "Varsinais-Suomi"],
  ]);

  it("groups the capital region cities under Pääkaupunkiseutu", () => {
    for (const city of ["Helsinki", "Espoo", "Vantaa", "Kauniainen"]) {
      expect(resolveRegion(city, maakuntaByCity)).toBe("Pääkaupunkiseutu");
    }
  });

  it("keeps Tampere and Turku standing alone", () => {
    expect(resolveRegion("Tampere", maakuntaByCity)).toBe("Tampere");
    expect(resolveRegion("Turku", maakuntaByCity)).toBe("Turku");
  });

  it("falls back to the scraped maakunta name for other cities", () => {
    expect(resolveRegion("Sodankylä", maakuntaByCity)).toBe("Lappi");
  });

  it("returns undefined when the city has no known maakunta", () => {
    expect(resolveRegion("Unknown City", maakuntaByCity)).toBeUndefined();
  });
});

describe("groupRegions", () => {
  it("puts the city regions first in fixed order and sorts the rest in Finnish order", () => {
    expect(
      groupRegions([
        "Uusimaa",
        "Turku",
        "Ahvenanmaa",
        "Pääkaupunkiseutu",
        "Etelä-Savo",
        "Tampere",
      ]),
    ).toEqual({
      cities: ["Pääkaupunkiseutu", "Tampere", "Turku"],
      others: ["Ahvenanmaa", "Etelä-Savo", "Uusimaa"],
    });
  });
});

describe("groupRegions display order", () => {
  it("sorts the other regions by their shown name in that language", async () => {
    const { i18nFor } = await import("~/i18n");
    const { t } = i18nFor("sv");
    const { others } = groupRegions(
      ["Uusimaa", "Ahvenanmaa", "Lappi"],
      t.regionName,
      "sv-FI",
    );
    expect(others.map(t.regionName)).toEqual(["Lappland", "Nyland", "Åland"]);
  });
});
