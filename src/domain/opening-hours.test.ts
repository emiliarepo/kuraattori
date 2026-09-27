import { describe, expect, it } from "vitest";

import {
  formatHours,
  hoursOn,
  nextFreeDay,
  weekdayIndex,
  type WeeklyHours,
} from "~/domain/opening-hours";

const kiasma: WeeklyHours = [
  null,
  { open: "10:00", close: "20:00" },
  { open: "10:00", close: "18:00" },
  { open: "10:00", close: "18:00" },
  { open: "10:00", close: "20:00" },
  { open: "10:00", close: "17:00" },
  { open: "10:00", close: "17:00" },
];

describe("hoursOn", () => {
  it("counts weekdays from Monday", () => {
    expect(weekdayIndex("2026-09-28")).toBe(0);
    expect(weekdayIndex("2026-09-27")).toBe(6);
  });

  it("tells closed days from unknown hours", () => {
    expect(hoursOn(kiasma, "2026-09-28")).toBeNull();
    expect(hoursOn(kiasma, "2026-09-29")).toEqual({
      open: "10:00",
      close: "20:00",
    });
    expect(hoursOn(null, "2026-09-29")).toBeUndefined();
  });
});

describe("nextFreeDay", () => {
  const days = ["2026-11-06", "2026-09-04", "2026-10-02"];

  it("picks the earliest free day from today on", () => {
    expect(nextFreeDay(days, "2026-09-27")).toBe("2026-10-02");
    expect(nextFreeDay(days, "2026-10-02")).toBe("2026-10-02");
  });

  it("ignores free days beyond the window", () => {
    expect(nextFreeDay(days, "2026-09-27", 14)).toBe("2026-10-02");
    expect(nextFreeDay(days, "2026-09-10", 14)).toBeUndefined();
  });
});

describe("formatHours", () => {
  it("drops whole-hour minutes and keeps the rest", () => {
    expect(formatHours({ open: "10:00", close: "18:00" })).toBe("10–18");
    expect(formatHours({ open: "09:30", close: "16:00" })).toBe("9.30–16");
  });
});
