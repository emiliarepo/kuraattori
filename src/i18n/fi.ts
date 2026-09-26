/**
 * All UI strings live here, accessed through this typed object. Formatting
 * (dates, numbers) uses `Intl` with the `fi-FI` locale, not string templates.
 */
export const t = {
  app: {
    name: "Kuraattori",
  },
  // Chrome strings for the app shell and shared components. Domain-derived
  // text (dates, counts, "why recommended") is computed by the caller and
  // passed in as props, not looked up here.
  ui: {
    nav: {
      koti: "Koti",
      selaa: "Selaa",
      omat: "Omat",
      profiili: "Profiili",
    },
    region: {
      label: "Alueet",
      sheetTitle: "Valitse alueet",
      allRegions: "Kaikki alueet",
      apply: "Valmis",
    },
    status: {
      interested: "Kiinnostaa",
      visited: "Käyty",
      hidden: "Piilota",
      announceSet: (label: string) => `Merkitty: ${label}`,
      announceCleared: "Merkintä poistettu",
    },
  },
} as const;
