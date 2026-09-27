import { describe, expect, it } from "vitest";

import { resolveLocale } from "./locales";

describe("resolveLocale", () => {
  it("prefers the signed-in user's saved choice over the cookie", () => {
    expect(resolveLocale("sv", "en")).toBe("sv");
  });

  it("uses the cookie when there is no saved choice", () => {
    expect(resolveLocale(null, "en")).toBe("en");
  });

  it("defaults to Finnish", () => {
    expect(resolveLocale(undefined, undefined)).toBe("fi");
  });

  it("ignores unknown values", () => {
    expect(resolveLocale("de", "xx")).toBe("fi");
  });
});
