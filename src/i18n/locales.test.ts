import { describe, expect, it } from "vitest";

import { localeFromAcceptLanguage, resolveLocale } from "./locales";

describe("resolveLocale", () => {
  it("prefers the signed-in user's saved choice over the cookie", () => {
    expect(resolveLocale("sv", "en", "fi")).toBe("sv");
  });

  it("uses the cookie when there is no saved choice", () => {
    expect(resolveLocale(null, "en", "sv-FI")).toBe("en");
  });

  it("falls back to the browser language", () => {
    expect(resolveLocale(undefined, undefined, "sv-SE,sv;q=0.9")).toBe("sv");
  });

  it("ignores unknown saved and cookie values", () => {
    expect(resolveLocale("de", "xx", "fi-FI")).toBe("fi");
  });
});

describe("localeFromAcceptLanguage", () => {
  it.each([
    ["fi-FI,fi;q=0.9,en;q=0.8", "fi"],
    ["sv-FI", "sv"],
    ["en-GB,en;q=0.9", "en"],
    ["de-DE,de;q=0.9,fi;q=0.5", "en"],
    ["en;q=0.4,fi;q=0.8", "fi"],
    ["*", "fi"],
    ["", "fi"],
    [null, "fi"],
  ])("%s → %s", (header, locale) => {
    expect(localeFromAcceptLanguage(header)).toBe(locale);
  });
});

describe("regionName", () => {
  it("renames Pääkaupunkiseutu in English and Swedish only", async () => {
    const { i18nFor } = await import(".");
    expect(i18nFor("fi").t.regionName("Pääkaupunkiseutu")).toBe(
      "Pääkaupunkiseutu",
    );
    expect(i18nFor("en").t.regionName("Pääkaupunkiseutu")).toBe(
      "Helsinki region",
    );
    expect(i18nFor("sv").t.regionName("Pääkaupunkiseutu")).toBe(
      "Huvudstadsregionen",
    );
    expect(i18nFor("en").t.regionName("Kainuu")).toBe("Kainuu");
    expect(i18nFor("en").t.regionName("Lappi")).toBe("Lapland");
    expect(i18nFor("sv").t.regionName("Turku")).toBe("Åbo");
  });
});
