import { describe, expect, it } from "vitest";

import { excerpt, tripWhyLabel } from "./exhibition-format";

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

describe("tripWhyLabel", () => {
  const from = "2026-10-01";
  const to = "2026-10-10";

  it("marks an exhibition ending during the trip", () => {
    expect(
      tripWhyLabel(
        { startDate: "2026-09-01", endDate: "2026-10-05" },
        from,
        to,
      ),
    ).toBe("Päättyy matkasi aikana");
  });

  it("marks an exhibition opening during the trip", () => {
    expect(
      tripWhyLabel(
        { startDate: "2026-10-05", endDate: "2026-12-31" },
        from,
        to,
      ),
    ).toBe("Avautuu 5.10.");
  });

  it("prefers the closing label when both open and close inside the trip", () => {
    expect(
      tripWhyLabel(
        { startDate: "2026-10-02", endDate: "2026-10-08" },
        from,
        to,
      ),
    ).toBe("Päättyy matkasi aikana");
  });

  it("is null when neither falls inside the trip", () => {
    expect(
      tripWhyLabel(
        { startDate: "2026-01-01", endDate: "2026-12-31" },
        from,
        to,
      ),
    ).toBeNull();
  });
});
