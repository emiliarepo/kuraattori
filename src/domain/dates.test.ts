import { describe, expect, it } from "vitest";

import { getDaysRemaining, getPhase, getTimeBarProgress } from "./dates";

const today = "2026-09-27";

describe("getPhase", () => {
  it("is current when it ends today", () => {
    expect(
      getPhase({ startDate: "2026-09-01", endDate: "2026-09-27" }, today),
    ).toBe("current");
  });

  it("is current when it ends tomorrow", () => {
    expect(
      getPhase({ startDate: "2026-09-01", endDate: "2026-09-28" }, today),
    ).toBe("current");
  });

  it("is ended when the end date is in the past", () => {
    expect(
      getPhase({ startDate: "2026-08-01", endDate: "2026-09-26" }, today),
    ).toBe("ended");
  });

  it("is upcoming when the start date is in the future", () => {
    expect(
      getPhase({ startDate: "2026-10-02", endDate: "2026-11-01" }, today),
    ).toBe("upcoming");
  });

  it("is current with no end date, as long as it has started", () => {
    expect(getPhase({ startDate: "2026-01-01", endDate: null }, today)).toBe(
      "current",
    );
  });
});

describe("getDaysRemaining", () => {
  it("is 0 when it ends today", () => {
    expect(getDaysRemaining({ endDate: "2026-09-27" }, today)).toBe(0);
  });

  it("is 1 when it ends tomorrow", () => {
    expect(getDaysRemaining({ endDate: "2026-09-28" }, today)).toBe(1);
  });

  it("is negative when already ended", () => {
    expect(getDaysRemaining({ endDate: "2026-09-26" }, today)).toBe(-1);
  });

  it("is null with no end date", () => {
    expect(getDaysRemaining({ endDate: null }, today)).toBeNull();
  });
});

describe("getTimeBarProgress", () => {
  it("is null with no end date", () => {
    expect(
      getTimeBarProgress({ startDate: "2026-01-01", endDate: null }, today),
    ).toBeNull();
  });

  it("is clamped to 100 once the run has ended", () => {
    expect(
      getTimeBarProgress(
        { startDate: "2026-01-01", endDate: "2026-01-10" },
        today,
      ),
    ).toBe(100);
  });

  it("is 0 on the start date", () => {
    expect(
      getTimeBarProgress({ startDate: today, endDate: "2026-10-27" }, today),
    ).toBe(0);
  });
});
