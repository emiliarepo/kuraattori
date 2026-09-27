import { describe, expect, it } from "vitest";

import { oldHostRedirect } from "./old-host";

const site = new URL("https://kuraattori.emiliarepo.dev");

describe("oldHostRedirect", () => {
  it("sends the old domain to the same path and query on the new one", () => {
    expect(
      oldHostRedirect(
        new URL("https://kuraattori.emialis.com/exhibitions?city=Turku"),
        site,
      )?.href,
    ).toBe("https://kuraattori.emiliarepo.dev/exhibitions?city=Turku");
  });

  it("keeps calendar feeds on the old domain", () => {
    expect(
      oldHostRedirect(
        new URL("https://kuraattori.emialis.com/api/calendar/abc.ics"),
        site,
      ),
    ).toBeNull();
  });

  it("leaves the new domain alone", () => {
    expect(
      oldHostRedirect(new URL("https://kuraattori.emiliarepo.dev/"), site),
    ).toBeNull();
  });
});
