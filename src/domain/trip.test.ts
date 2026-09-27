import { describe, expect, it } from "vitest";

import { endsSoonForTrip, partitionEndingSoon } from "./trip";

const today = "2026-09-27";

describe("endsSoonForTrip", () => {
  it.each([
    ["ends during the trip", "2026-12-03", true],
    ["ends 14 days after the trip starts", "2026-12-15", true],
    ["ends 15 days after the trip starts", "2026-12-16", false],
    ["has no end date", null, false],
  ])("%s", (_, endDate, expected) => {
    expect(
      endsSoonForTrip({ endDate }, "2026-12-01", "2026-12-03", today),
    ).toBe(expected);
  });

  it("counts the window from today once the trip has started", () => {
    expect(
      endsSoonForTrip(
        { endDate: "2026-10-10" },
        "2026-09-20",
        "2026-09-28",
        today,
      ),
    ).toBe(true);
    expect(
      endsSoonForTrip(
        { endDate: "2026-10-12" },
        "2026-09-20",
        "2026-09-28",
        today,
      ),
    ).toBe(false);
  });
});

describe("partitionEndingSoon", () => {
  it("moves ending-soon items first and keeps the order inside each group", () => {
    const items = [
      { id: 1, endDate: null },
      { id: 2, endDate: "2026-12-02" },
      { id: 3, endDate: "2027-05-01" },
      { id: 4, endDate: "2026-12-10" },
    ];
    const { endingSoon, rest } = partitionEndingSoon(
      items,
      "2026-12-01",
      "2026-12-03",
      today,
    );
    expect(endingSoon.map((item) => item.id)).toEqual([2, 4]);
    expect(rest.map((item) => item.id)).toEqual([1, 3]);
  });
});
