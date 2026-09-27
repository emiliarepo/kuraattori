import { describe, expect, it } from "vitest";

import { i18nFor } from ".";
import {
  formatDate,
  formatDaysRemaining,
  formatDayMonth,
  formatUpcomingStart,
} from "./format";

const fi = i18nFor("fi");
const en = i18nFor("en");
const sv = i18nFor("sv");

describe("formatDate", () => {
  it("formats a full date per locale", () => {
    expect(formatDate("2026-09-27", "fi")).toBe("27.9.2026");
    expect(formatDate("2026-09-27", "en")).toBe("27/09/2026");
    expect(formatDate("2026-09-27", "sv")).toBe("27.9.2026");
  });
});

describe("formatDayMonth", () => {
  it("formats day and month per locale", () => {
    expect(formatDayMonth("2026-10-02", "fi")).toBe("2.10.");
    expect(formatDayMonth("2026-10-02", "en")).toBe("02/10");
    expect(formatDayMonth("2026-10-02", "sv")).toBe("2.10");
  });
});

describe("formatDaysRemaining", () => {
  it("says it ends today for 0 days", () => {
    expect(formatDaysRemaining(0, fi)).toBe("Päättyy tänään");
    expect(formatDaysRemaining(0, en)).toBe("Ends today");
    expect(formatDaysRemaining(0, sv)).toBe("Slutar i dag");
  });

  it("uses the singular for 1 day", () => {
    expect(formatDaysRemaining(1, fi)).toBe("1 päivä jäljellä");
    expect(formatDaysRemaining(1, en)).toBe("1 day left");
    expect(formatDaysRemaining(1, sv)).toBe("1 dag kvar");
  });

  it("uses the plural for more than 1 day", () => {
    expect(formatDaysRemaining(3, fi)).toBe("3 päivää jäljellä");
    expect(formatDaysRemaining(3, en)).toBe("3 days left");
    expect(formatDaysRemaining(3, sv)).toBe("3 dagar kvar");
  });
});

describe("formatUpcomingStart", () => {
  it("formats an upcoming start date per locale", () => {
    expect(formatUpcomingStart("2026-10-02", fi)).toBe("Alkaa 2.10.");
    expect(formatUpcomingStart("2026-10-02", en)).toBe("Opens 02/10");
    expect(formatUpcomingStart("2026-10-02", sv)).toBe("Öppnar 2.10");
  });
});
