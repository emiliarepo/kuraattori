import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildPassport,
  postmarkDate,
  STAMP_INKS,
  STAMP_PAPER,
  STAMP_POSTMARK,
  stampLabel,
  stampLook,
} from "~/domain/passport";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

describe("stamp palette", () => {
  const css = readFileSync(
    new URL("../styles/tokens.css", import.meta.url),
    "utf8",
  );

  it.each(Object.entries(STAMP_INKS))(
    "%s matches tokens.css and passes AA with the paper",
    (name, hex) => {
      expect(css).toContain(`--stamp-${name}: ${hex};`);
      expect(contrast(hex, STAMP_PAPER)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("keeps paper and postmark in sync with tokens.css", () => {
    expect(css).toContain(`--stamp-paper: ${STAMP_PAPER};`);
    expect(css).toContain(`--stamp-postmark: ${STAMP_POSTMARK};`);
  });
});

describe("stampLook", () => {
  it("is deterministic and bounded", () => {
    for (let id = 1; id < 500; id++) {
      const look = stampLook(id);
      expect(stampLook(id)).toEqual(look);
      expect(Math.abs(look.rotation)).toBeLessThanOrEqual(2);
      expect(Math.abs(look.postmarkRotation)).toBeLessThanOrEqual(18);
    }
  });

  it("uses every ink across museums", () => {
    const inks = new Set(
      Array.from({ length: 50 }, (_, id) => stampLook(id).ink),
    );
    expect(inks.size).toBe(Object.keys(STAMP_INKS).length);
  });
});

describe("stampLabel", () => {
  it.each([
    ["Kiasma", ["Kiasma"]],
    ["Museokeskus Vapriikki", ["Vapriikki"]],
    ["Ett Hem -museo", ["Ett Hem"]],
    ["Malmin talo, Pietarsaaren museo", ["Malmin", "talo"]],
    ["Lusto - Suomen Metsämuseo", ["Lusto"]],
    ["Urheilun ja liikunnan kulttuurikeskus TAHTO", ["TAHTO"]],
    ["Sinebrychoffin taidemuseo", ["Sinebrychoffin", "taidemuseo"]],
    ["Sotamuseo Maneesi", ["Maneesi"]],
    ["Nykytaiteen museo Kiasma", ["Kiasma"]],
    ["LUOMUS Luonnontieteellinen museo", ["LUOMUS"]],
    ["Särestöniemi-museo", ["Särestöniemi"]],
    ["Vantaan historian museo", ["Vantaan", "historian"]],
    ["Näyttelykeskus WeeGee", ["WeeGee"]],
  ])("%s", (name, expected) => {
    expect(stampLabel(name)).toEqual(expected);
  });
});

it("formats the postmark date with a Roman month in Helsinki time", () => {
  expect(postmarkDate(new Date("2026-09-26T22:30:00Z"))).toBe("27.IX.2026");
});

describe("buildPassport", () => {
  const museums = [
    {
      id: 1,
      name: "Ateneum",
      slug: "a",
      city: "Helsinki",
      region: "Pääkaupunkiseutu",
    },
    {
      id: 2,
      name: "Kiasma",
      slug: "k",
      city: "Helsinki",
      region: "Pääkaupunkiseutu",
    },
    { id: 3, name: "Vapriikki", slug: "v", city: "Tampere", region: "Tampere" },
    { id: 4, name: "Aboa", slug: "b", city: "Turku", region: "Turku" },
    {
      id: 5,
      name: "Lusto",
      slug: "l",
      city: "Savonlinna",
      region: "Etelä-Savo",
    },
    { id: 6, name: "Tuntematon", slug: "t", city: null, region: null },
  ];

  it("counts stamps and orders cities first, stamped by first visit", () => {
    const passport = buildPassport(
      museums,
      new Map([
        [2, new Date("2026-01-01")],
        [1, new Date("2026-05-01")],
        [5, new Date("2026-03-01")],
      ]),
      "Muu",
    );
    expect(passport.total).toBe(6);
    expect(passport.stampedCount).toBe(3);
    expect(passport.regions.map((r) => r.region)).toEqual([
      "Pääkaupunkiseutu",
      "Tampere",
      "Turku",
      "Etelä-Savo",
      "Muu",
    ]);
    const capital = passport.regions[0]!;
    expect(capital.total).toBe(2);
    expect(capital.stamped.map((m) => m.name)).toEqual(["Kiasma", "Ateneum"]);
    expect(passport.regions[1]!.unstamped.map((m) => m.name)).toEqual([
      "Vapriikki",
    ]);
  });
});
