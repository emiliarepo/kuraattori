import { describe, expect, it } from "vitest";

import { imageSources } from "./images";

const today = "2026-09-27";
const source = "https://museot.fi/uploadkuvat/a.jpg";
const key = "exhibitions/1/abc.webp";

describe("imageSources", () => {
  it("tries museot.fi first, then the archive, while the exhibition runs", () => {
    expect(
      imageSources(
        {
          startDate: "2026-09-01",
          endDate: "2026-10-01",
          imageUrl: source,
          imageArchiveKey: key,
        },
        today,
      ),
    ).toEqual([source, `/img/${key}`]);
  });

  it("does the same for an upcoming exhibition without an archived copy", () => {
    expect(
      imageSources(
        {
          startDate: "2026-11-01",
          endDate: null,
          imageUrl: source,
          imageArchiveKey: null,
        },
        today,
      ),
    ).toEqual([source]);
  });

  it("puts the archived copy first once the exhibition has ended", () => {
    const ended = { startDate: "2026-01-01", endDate: "2026-09-26" };
    expect(
      imageSources({ ...ended, imageUrl: source, imageArchiveKey: key }, today),
    ).toEqual([`/img/${key}`, source]);
    expect(
      imageSources(
        { ...ended, imageUrl: source, imageArchiveKey: null },
        today,
      ),
    ).toEqual([source]);
  });
});
