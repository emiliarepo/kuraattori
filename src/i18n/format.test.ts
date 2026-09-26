import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDaysRemaining,
  formatDayMonth,
  formatUpcomingStart,
} from "./format";

describe("formatDate", () => {
  it("formats a full Finnish date", () => {
    expect(formatDate("2026-09-27")).toBe("27.9.2026");
  });
});

describe("formatDayMonth", () => {
  it("formats day and month with a trailing period", () => {
    expect(formatDayMonth("2026-10-02")).toBe("2.10.");
  });
});

describe("formatDaysRemaining", () => {
  it("says it ends today for 0 days", () => {
    expect(formatDaysRemaining(0)).toBe("Päättyy tänään");
  });

  it("uses the singular for 1 day", () => {
    expect(formatDaysRemaining(1)).toBe("1 päivä jäljellä");
  });

  it("uses the partitive plural for more than 1 day", () => {
    expect(formatDaysRemaining(3)).toBe("3 päivää jäljellä");
  });
});

describe("formatUpcomingStart", () => {
  it("formats an upcoming start date", () => {
    expect(formatUpcomingStart("2026-10-02")).toBe("Alkaa 2.10.");
  });
});
