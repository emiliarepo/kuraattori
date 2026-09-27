import { describe, expect, it } from "vitest";

import { selectClosingPushes, type InterestedEnding } from "./closing-push";

const TODAY = "2026-09-27";

function item(
  exhibitionId: number,
  endDate: string,
  userId = "u1",
  locale: InterestedEnding["locale"] = "fi",
): InterestedEnding {
  return {
    userId,
    exhibitionId,
    title: `Näyttely ${exhibitionId}`,
    museum: "Kiasma",
    slug: `nayttely-${exhibitionId}`,
    endDate,
    locale,
  };
}

describe("selectClosingPushes", () => {
  it("notifies an exhibition with seven days left and links to it", () => {
    expect(selectClosingPushes([item(1, "2026-10-04")], [], TODAY)).toEqual([
      {
        userId: "u1",
        exhibitionIds: [1],
        title: "Päättyy viikon päästä: Näyttely 1, Kiasma",
        body: "Kiinnostava näyttely päättyy pian.",
        url: "/exhibitions/nayttely-1",
      },
    ]);
  });

  it("covers the whole week so a missed night or a late Kiinnostaa still notifies", () => {
    const pushes = selectClosingPushes(
      [
        item(1, "2026-10-05"),
        item(2, "2026-09-28", "u2"),
        item(3, "2026-09-27", "u3"),
      ],
      [],
      TODAY,
    );
    expect(pushes.map((p) => [p.userId, p.title])).toEqual([
      ["u2", "Päättyy huomenna: Näyttely 2, Kiasma"],
    ]);
  });

  it("never repeats an exhibition already notified", () => {
    expect(
      selectClosingPushes(
        [item(1, "2026-10-01")],
        [{ userId: "u1", exhibitionId: 1, sentOn: "2026-09-25" }],
        TODAY,
      ),
    ).toEqual([]);
  });

  it("sends nothing more to a user notified today", () => {
    expect(
      selectClosingPushes(
        [item(2, "2026-10-04")],
        [{ userId: "u1", exhibitionId: 1, sentOn: TODAY }],
        TODAY,
      ),
    ).toEqual([]);
  });

  it("bundles several due exhibitions into one notification per user", () => {
    const pushes = selectClosingPushes(
      [item(1, "2026-10-04"), item(2, "2026-09-30"), item(3, "2026-10-02")],
      [],
      TODAY,
    );
    expect(pushes).toEqual([
      {
        userId: "u1",
        exhibitionIds: [2, 3, 1],
        title: "3 kiinnostavaa näyttelyä päättyy viikon sisällä",
        body: "Näyttely 2 · Näyttely 3 · Näyttely 1",
        url: "/my/interested",
      },
    ]);
  });

  it("writes the notification in the user's language", () => {
    const [push] = selectClosingPushes(
      [item(1, "2026-09-28", "u1", "en")],
      [],
      TODAY,
    );
    expect(push?.title).toBe("Closes tomorrow: Näyttely 1, Kiasma");
  });
});
