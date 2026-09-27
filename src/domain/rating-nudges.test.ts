import { describe, expect, it } from "vitest";

import { proposeWeightNudges, type RatedVisit } from "./rating-nudges";

const up = (...categoryIds: number[]): RatedVisit => ({
  categoryIds,
  rating: "up",
});
const down = (...categoryIds: number[]): RatedVisit => ({
  categoryIds,
  rating: "down",
});

describe("proposeWeightNudges", () => {
  it("needs enough ratings before nudging", () => {
    expect(proposeWeightNudges([up(1), up(1)], new Map())).toEqual([]);
  });

  it("raises a category one step on a clear majority of 👍", () => {
    expect(
      proposeWeightNudges([up(1), up(1), down(1), up(1)], new Map([[1, 1]])),
    ).toEqual([{ categoryId: 1, from: 1, to: 2, up: 3, down: 1 }]);
  });

  it("lowers an unweighted category to Ei kiinnosta on a clear majority of 👎", () => {
    expect(proposeWeightNudges([down(4), down(4), down(4)], new Map())).toEqual(
      [{ categoryId: 4, from: 0, to: -1, up: 0, down: 3 }],
    );
  });

  it("leaves split verdicts and the ends of the scale alone", () => {
    expect(
      proposeWeightNudges(
        [up(1, 2), up(1, 2), down(1, 2), down(1), up(2)],
        new Map([[2, 2]]),
      ),
    ).toEqual([]);
  });

  it("counts a visit once per category", () => {
    expect(proposeWeightNudges([up(3, 3, 3)], new Map())).toEqual([]);
  });
});
