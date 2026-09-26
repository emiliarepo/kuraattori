import { describe, expect, it } from "vitest";

import { resolveRegion } from "./regions";

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
