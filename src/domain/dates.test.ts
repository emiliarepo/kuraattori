import { describe, expect, it } from "vitest";

import {
  getDaysRemaining,
  getPhase,
  getTimeBarProgress,
  overlapsRange,
} from "./dates";

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

describe("overlapsRange", () => {
  const range = { from: "2026-10-01", to: "2026-10-10" };

  it("overlaps when the run spans the whole range", () => {
    expect(
      overlapsRange(
        { startDate: "2026-09-01", endDate: "2026-12-31" },
        range.from,
        range.to,
      ),
    ).toBe(true);
  });

  it("overlaps when it starts inside the range and has no end date", () => {
    expect(
      overlapsRange(
        { startDate: "2026-10-05", endDate: null },
        range.from,
        range.to,
      ),
    ).toBe(true);
  });

  it("overlaps when it ends exactly on the range's start", () => {
    expect(
      overlapsRange(
        { startDate: "2026-09-01", endDate: "2026-10-01" },
        range.from,
        range.to,
      ),
    ).toBe(true);
  });

  it("overlaps when it starts exactly on the range's end", () => {
    expect(
      overlapsRange(
        { startDate: "2026-10-10", endDate: "2026-11-01" },
        range.from,
        range.to,
      ),
    ).toBe(true);
  });

  it("does not overlap when it ends before the range starts", () => {
    expect(
      overlapsRange(
        { startDate: "2026-08-01", endDate: "2026-09-30" },
        range.from,
        range.to,
      ),
    ).toBe(false);
  });

  it("does not overlap when it starts after the range ends", () => {
    expect(
      overlapsRange(
        { startDate: "2026-10-11", endDate: "2026-12-31" },
        range.from,
        range.to,
      ),
    ).toBe(false);
  });
});
