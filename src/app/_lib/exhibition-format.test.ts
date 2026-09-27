import { describe, expect, it } from "vitest";

import { excerpt } from "./exhibition-format";

describe("excerpt", () => {
  it("returns short text unchanged apart from whitespace", () => {
    expect(excerpt("  Lyhyt\n\nkuvaus.  ")).toBe("Lyhyt kuvaus.");
  });

  it("cuts at the last word boundary and drops trailing punctuation", () => {
    expect(excerpt("Näyttely esittelee, taiteilijan työtä", 22)).toBe(
      "Näyttely esittelee…",
    );
  });
});
