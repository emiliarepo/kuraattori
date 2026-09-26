import { describe, expect, it } from "vitest";

import { getUrgency } from "./urgency";

const today = "2026-09-27";

function endDateAfter(daysRemaining: number): string {
  const date = new Date("2026-09-27T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + daysRemaining);
  return date.toISOString().slice(0, 10);
}

describe("getUrgency", () => {
  it("is 100 when it ends today", () => {
    expect(getUrgency({ endDate: "2026-09-27" }, today)).toBe(100);
  });

  it("is 90 when it ends tomorrow", () => {
    expect(getUrgency({ endDate: "2026-09-28" }, today)).toBe(90);
  });

  it("is 0 when it already ended", () => {
    expect(getUrgency({ endDate: "2026-09-26" }, today)).toBe(0);
  });

  it("is 0 with no end date", () => {
    expect(getUrgency({ endDate: null }, today)).toBe(0);
  });

  it.each([
    [61, 0],
    [60, 10],
    [31, 10],
    [30, 25],
    [15, 25],
    [14, 50],
    [7, 50],
    [6, 75],
    [2, 75],
  ])("is %i days remaining -> urgency %i", (daysRemaining, expected) => {
    expect(getUrgency({ endDate: endDateAfter(daysRemaining) }, today)).toBe(
      expected,
    );
  });
});
