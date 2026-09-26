import { describe, expect, it } from "vitest";

import { transitionStatus } from "./status";

describe("transitionStatus", () => {
  it("interested -> visited sets visitedAt", () => {
    expect(transitionStatus("interested", "visited")).toEqual({
      status: "visited",
      visitedAt: "set",
    });
  });

  it("hidden -> interested clears visitedAt", () => {
    expect(transitionStatus("hidden", "interested")).toEqual({
      status: "interested",
      visitedAt: "clear",
    });
  });

  it("visited -> visited (pressing the active button) clears the status", () => {
    expect(transitionStatus("visited", "visited")).toEqual({
      status: null,
      visitedAt: "clear",
    });
  });

  it("no prior status -> interested sets it", () => {
    expect(transitionStatus(null, "interested")).toEqual({
      status: "interested",
      visitedAt: "clear",
    });
  });
});
