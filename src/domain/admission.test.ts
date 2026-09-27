import { describe, expect, it } from "vitest";

import { parseAdultAdmissionCents } from "./admission";

describe("parseAdultAdmissionCents", () => {
  it.each([
    ["23/13/0 €", 2300],
    ["22/14/0", 2200],
    ["12 €", 1200],
    ["0 €", 0],
    ["13,50/8,50/0 €", 1350],
    ["16€ / 10€", 1600],
    ["8,50€/5,50€/0€", 850],
    ["3 / 2 / 1,5 €", 300],
    ["12/9/0 €.", 1200],
    ["18/16/9/40 €", 1800],
    ["10/8/6/0 € Vapaa pääsy alle 24-vuotiaille", 1000],
    [
      "12€/aikuinen, 10€/opiskelija, työtön, eläkeläinen ja 0 €/alle 18-vuotias",
      1200,
    ],
    ["Pääsymaksut 15/10/0 €", 1500],
    ["Pääsymaksut 2026: 22/17/10€. Lapset alle 7-vuotta veloituksetta.", 2200],
    ["Pääsylippu 8,50 €/5,50 € (voimassa 2 pvä) Alle 18-v. vapaa pääsy", 850],
    ["Sisäänpääsy myös Museokortilla. Pääsymaksut 7,00/5,00/0 €", 700],
    ["Museokortti/Museikort/Museum Card: 0€. Norm. 26/19 €", 2600],
    [
      "Normaali 10 €, eläkeläiset, opiskelijat ja työttömät 6 €, alle 18-vuotiaat 0 €.",
      1000,
    ],
    [
      "Aikuinen 10 €, eläkeläinen, opiskelija, varusmies, työtön ja yli 10 henkilön ryhmät 7 €/hlö.",
      1000,
    ],
    ["Vapaa pääsy", 0],
    ["Aina vapaa pääsy.", 0],
    ["​Kaikille vapaa pääsy/ Ei pääsymaksua", 0],
    ["llmainen sisäänpääsy / Fritt inträde / Free admission", 0],
    ["0/0/0 €", 0],
  ])("parses %j", (text, cents) => {
    expect(parseAdultAdmissionCents(text)).toBe(cents);
  });

  it.each([
    undefined,
    "0",
    "Vapaaehtoinen pääsymaksu.",
    "0/6/10 €, opiskelijoille ja alle 18-vuotiaille vapaa pääsy",
    "Kotimuseo: 0 € Erikoisnäyttelyt: 21/19/13/0 €",
    "Vuonna 2025: 14,50 / 7 / 0 € Vuonna 2026: 18 / 9 / 0 €",
    "Pääsymaksu 7.2.-14.6.26: 16 / 8 / 0 €. Museokortilla vapaa pääsy.",
    "2.1.2026 alkaen sisäänpääsyliput 15/10/7 €.",
    "Planetaario 8/6 Observatoriokierros 10/6",
    "Aikuiset: Aboa Vetus 14 € Ars Nova 14 € Yhdistelmälippu 20 €",
    "Liput: museo 8€ aikuiset 5€ lapset (3-12v)",
  ])("leaves %j unparsed", (text) => {
    expect(parseAdultAdmissionCents(text)).toBeUndefined();
  });
});
