import { describe, expect, it } from "vitest";

import { i18nFor } from "~/i18n";

import { excerpt, timeBarProps, tripWhyLabel } from "./exhibition-format";

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
  const fi = i18nFor("fi");
  const from = "2026-10-01";
  const to = "2026-10-10";

  it("marks an exhibition ending during the trip", () => {
    expect(
      tripWhyLabel(
        { startDate: "2026-09-01", endDate: "2026-10-05" },
        from,
        to,
        fi,
      ),
    ).toBe("Päättyy matkasi aikana");
  });

  it("marks an exhibition opening during the trip", () => {
    expect(
      tripWhyLabel(
        { startDate: "2026-10-05", endDate: "2026-12-31" },
        from,
        to,
        fi,
      ),
    ).toBe("Avautuu 5.10.");
  });

  it("prefers the closing label when both open and close inside the trip", () => {
    expect(
      tripWhyLabel(
        { startDate: "2026-10-02", endDate: "2026-10-08" },
        from,
        to,
        fi,
      ),
    ).toBe("Päättyy matkasi aikana");
  });

  it("is null when neither falls inside the trip", () => {
    expect(
      tripWhyLabel(
        { startDate: "2026-01-01", endDate: "2026-12-31" },
        from,
        to,
        fi,
      ),
    ).toBeNull();
  });
});

describe("timeBarProps", () => {
  const today = "2026-09-27";
  const closingSoon = { startDate: "2026-09-01", endDate: "2026-09-30" };

  it("labels the time left and dates in each locale", () => {
    expect(timeBarProps(closingSoon, today, i18nFor("fi"))).toMatchObject({
      startLabel: "1.9.",
      endLabel: "30.9.2026",
      remainingLabel: "3 päivää jäljellä",
    });
    expect(timeBarProps(closingSoon, today, i18nFor("en"))).toMatchObject({
      startLabel: "01/09",
      endLabel: "30/09/2026",
      remainingLabel: "3 days left",
    });
    expect(timeBarProps(closingSoon, today, i18nFor("sv"))).toMatchObject({
      startLabel: "1.9",
      endLabel: "30.9.2026",
      remainingLabel: "3 dagar kvar",
    });
  });
});
