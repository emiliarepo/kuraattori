import { describe, expect, it } from "vitest";

import { parseDateRange } from "./dates";

describe("parseDateRange", () => {
  it("parses a closed range with spaced en dash", () => {
    expect(parseDateRange("1.10.2026 – 20.10.2026")).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-10-20",
    });
  });

  it("parses a closed range with no spaces around the dash", () => {
    expect(parseDateRange("6.11.2026–28.3.2027")).toEqual({
      startDate: "2026-11-06",
      endDate: "2027-03-28",
    });
  });

  it("parses an open-ended range with no end date", () => {
    expect(parseDateRange("4.11.2021 – ")).toEqual({
      startDate: "2021-11-04",
      endDate: undefined,
    });
  });

  it("returns undefined for text that isn't a date range", () => {
    expect(parseDateRange("Toistaiseksi")).toBeUndefined();
  });
});
