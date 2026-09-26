import { describe, expect, it } from "vitest";

import { t } from "./fi";

describe("fi", () => {
  it("exposes the app name", () => {
    expect(t.app.name).toBe("Kuraattori");
  });
});
