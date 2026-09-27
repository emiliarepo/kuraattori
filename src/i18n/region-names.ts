/**
 * English and Swedish names for museot.fi's region identifiers. A region
 * missing here keeps its Finnish name.
 */
export const REGION_NAMES: Record<
  "en" | "sv",
  Readonly<Record<string, string>>
> = {
  en: {
    Ahvenanmaa: "Åland",
    "Etelä-Karjala": "South Karelia",
    "Etelä-Pohjanmaa": "South Ostrobothnia",
    "Etelä-Savo": "South Savo",
    "Itä-Uusimaa": "Eastern Uusimaa",
    "Keski-Pohjanmaa": "Central Ostrobothnia",
    "Keski-Suomi": "Central Finland",
    Lappi: "Lapland",
    Pohjanmaa: "Ostrobothnia",
    "Pohjois-Karjala": "North Karelia",
    "Pohjois-Pohjanmaa": "North Ostrobothnia",
    "Pohjois-Savo": "North Savo",
    Pääkaupunkiseutu: "Helsinki region",
    "Varsinais-Suomi": "Southwest Finland",
  },
  sv: {
    Ahvenanmaa: "Åland",
    "Etelä-Karjala": "Södra Karelen",
    "Etelä-Pohjanmaa": "Södra Österbotten",
    "Etelä-Savo": "Södra Savolax",
    "Itä-Uusimaa": "Östra Nyland",
    Kainuu: "Kajanaland",
    "Kanta-Häme": "Egentliga Tavastland",
    "Keski-Pohjanmaa": "Mellersta Österbotten",
    "Keski-Suomi": "Mellersta Finland",
    Kymenlaakso: "Kymmenedalen",
    Lappi: "Lappland",
    Pirkanmaa: "Birkaland",
    Pohjanmaa: "Österbotten",
    "Pohjois-Karjala": "Norra Karelen",
    "Pohjois-Pohjanmaa": "Norra Österbotten",
    "Pohjois-Savo": "Norra Savolax",
    "Päijät-Häme": "Päijänne-Tavastland",
    Pääkaupunkiseutu: "Huvudstadsregionen",
    Tampere: "Tammerfors",
    Turku: "Åbo",
    Uusimaa: "Nyland",
    "Varsinais-Suomi": "Egentliga Finland",
  },
};
