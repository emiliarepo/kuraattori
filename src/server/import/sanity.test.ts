import { describe, expect, it } from "vitest";

import { importSanityError } from "./sanity";

describe("importSanityError", () => {
  it("accepts the first run and exact threshold boundaries", () => {
    expect(importSanityError(undefined, 0, 0)).toBeUndefined();
    expect(importSanityError(100, 50, 0)).toBeUndefined();
    expect(importSanityError(100, 95, 5)).toBeUndefined();
  });

  it("rejects a fetch count below half the last successful run", () => {
    expect(importSanityError(100, 49, 0)).toContain("below 50%");
  });

  it("rejects failures above five percent of attempted items", () => {
    expect(importSanityError(100, 94, 6)).toContain("above 5%");
    expect(importSanityError(undefined, 0, 1)).toContain("above 5%");
  });
});
