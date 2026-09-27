import { describe, expect, it } from "vitest";

import { localized } from "./localized";

const exhibition = {
  titleFi: "Mökillä",
  titleEn: "At the Summer Cabin",
  titleSv: null,
  descriptionFi: "Kuvia kesämökeiltä.",
  descriptionEn: "  ",
  descriptionSv: "",
};

describe("localized", () => {
  it("uses the translation when present", () => {
    expect(localized(exhibition, "title", "en")).toEqual({
      text: "At the Summer Cabin",
      lang: undefined,
    });
  });

  it("falls back to Finnish when the translation is missing", () => {
    expect(localized({ titleFi: "Mökillä" }, "title", "en")).toEqual({
      text: "Mökillä",
      lang: "fi",
    });
  });

  it("treats empty and whitespace-only translations as missing", () => {
    expect(localized(exhibition, "description", "en")).toEqual({
      text: "Kuvia kesämökeiltä.",
      lang: "fi",
    });
    expect(localized(exhibition, "description", "sv").lang).toBe("fi");
  });

  it("falls back from Swedish to Finnish, not English", () => {
    expect(localized(exhibition, "title", "sv")).toEqual({
      text: "Mökillä",
      lang: "fi",
    });
  });

  it("returns Finnish unmarked in the Finnish locale", () => {
    expect(localized(exhibition, "title", "fi")).toEqual({
      text: "Mökillä",
      lang: undefined,
    });
  });

  it("reads a plain Finnish column such as a museum name", () => {
    const museum = {
      name: "Riihisaari",
      nameEn: "Riihisaari – Savonlinna Museum",
    };
    expect(localized(museum, "name", "en").text).toBe(
      "Riihisaari – Savonlinna Museum",
    );
    expect(localized(museum, "name", "sv")).toEqual({
      text: "Riihisaari",
      lang: "fi",
    });
  });

  it("returns empty text without a lang when there is nothing at all", () => {
    expect(localized({ descriptionFi: null }, "description", "en")).toEqual({
      text: "",
      lang: undefined,
    });
  });
});
