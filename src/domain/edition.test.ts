import { describe, expect, it } from "vitest";

import {
  dateHash,
  isSunday,
  latestSunday,
  selectEdition,
  type EditionCandidate,
} from "./edition";

const SUNDAY = "2026-10-04";

const candidate = (
  id: number,
  overrides: Partial<EditionCandidate> = {},
): EditionCandidate => ({
  id,
  museumId: id,
  startDate: "2026-01-01",
  endDate: null,
  categoryCount: 1,
  hasImage: true,
  ...overrides,
});

describe("Sundays", () => {
  it("finds the latest Sunday on or before today", () => {
    expect(latestSunday("2026-10-04")).toBe("2026-10-04");
    expect(latestSunday("2026-10-10")).toBe("2026-10-04");
    expect(latestSunday("2026-10-05")).toBe("2026-10-04");
  });

  it("accepts only well-formed Sundays", () => {
    expect(isSunday("2026-10-04")).toBe(true);
    expect(isSunday("2026-10-05")).toBe(false);
    expect(isSunday("2026-10-4")).toBe(false);
  });
});

describe("selectEdition", () => {
  it("leads with the recent opening with most categories, then an image", () => {
    const selection = selectEdition(
      [
        candidate(1, {
          startDate: "2026-09-25",
          categoryCount: 2,
          hasImage: false,
        }),
        candidate(2, { startDate: "2026-09-28", categoryCount: 2 }),
        candidate(3, { startDate: "2026-09-30", categoryCount: 1 }),
        candidate(4, { startDate: "2026-09-20", categoryCount: 5 }),
        candidate(5, { startDate: "2026-10-06", categoryCount: 9 }),
      ],
      SUNDAY,
    );
    expect(selection.leadId).toBe(2);
  });

  it("lists this week's closings and openings, Monday to Sunday", () => {
    const selection = selectEdition(
      [
        candidate(1, { endDate: "2026-10-04" }),
        candidate(2, { endDate: "2026-10-05" }),
        candidate(3, { endDate: "2026-10-11" }),
        candidate(4, { endDate: "2026-10-12" }),
        candidate(5, { startDate: "2026-10-05" }),
        candidate(6, { startDate: "2026-10-11" }),
        candidate(7, { startDate: "2026-10-12" }),
      ],
      SUNDAY,
    );
    expect(selection.endingIds).toEqual([2, 3]);
    expect(selection.openingIds).toEqual([5, 6]);
  });

  it("picks the hidden gem from museums with at most two current exhibitions, by the date's hash", () => {
    const busy = [10, 11, 12].map((id) => candidate(id, { museumId: 99 }));
    const small = [20, 21, 22].map((id) => candidate(id));
    const selection = selectEdition([...busy, ...small], SUNDAY);
    expect(selection.gemId).toBe([20, 21, 22][dateHash(SUNDAY) % 3]);
  });

  it("rotates the hidden gem between weeks", () => {
    const pool = Array.from({ length: 12 }, (_, i) => candidate(i + 1));
    const gems = new Set(
      ["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"].map(
        (date) => selectEdition(pool, date).gemId,
      ),
    );
    expect(gems.size).toBeGreaterThan(1);
  });

  it("is deterministic regardless of input order", () => {
    const pool = [
      candidate(1, { startDate: "2026-09-30", categoryCount: 3 }),
      candidate(2, { endDate: "2026-10-08" }),
      candidate(3, { startDate: "2026-10-07" }),
      candidate(4),
      candidate(5),
    ];
    expect(selectEdition([...pool].reverse(), SUNDAY)).toEqual(
      selectEdition(pool, SUNDAY),
    );
  });
});
