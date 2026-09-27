import { afterEach, describe, expect, it, vi } from "vitest";

import { describeD1Error, logServerError } from "./log-error";

describe("describeD1Error", () => {
  it("recognises a D1_ERROR message and extracts its SQLITE code", () => {
    expect(
      describeD1Error(new Error("D1_ERROR: too many rows read: SQLITE_TOOBIG")),
    ).toEqual({ isD1Error: true, code: "SQLITE_TOOBIG" });
  });

  it("recognises a D1_ERROR message with no SQLITE code", () => {
    expect(
      describeD1Error(new Error("D1_ERROR: Network connection lost.")),
    ).toEqual({ isD1Error: true, code: null });
  });

  it("does not flag unrelated errors as D1 failures", () => {
    expect(describeD1Error(new Error("UNAUTHORIZED"))).toEqual({
      isD1Error: false,
      code: null,
    });
  });
});

describe("logServerError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs source, userId presence, error details and the D1 code", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logServerError(
      "trpc.recommendation.forYou",
      new Error("D1_ERROR: too many rows read: SQLITE_TOOBIG"),
      { userId: "user-1" },
    );

    expect(spy).toHaveBeenCalledWith("[server-error]", {
      source: "trpc.recommendation.forYou",
      userIdPresent: true,
      errorName: "Error",
      errorMessage: "D1_ERROR: too many rows read: SQLITE_TOOBIG",
      d1ErrorCode: "SQLITE_TOOBIG",
    });
  });

  it("omits the D1 code and reports no user for a non-D1, anonymous failure", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logServerError("getActiveRegions", new Error("boom"));

    expect(spy).toHaveBeenCalledWith("[server-error]", {
      source: "getActiveRegions",
      userIdPresent: false,
      errorName: "Error",
      errorMessage: "boom",
      d1ErrorCode: null,
    });
  });
});
