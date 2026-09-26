/**
 * All UI strings live here, accessed through this typed object. Formatting
 * (dates, numbers) uses `Intl` with the `fi-FI` locale, not string templates.
 */
export const t = {
  app: {
    name: "Kuraattori",
  },
  time: {
    endsToday: "Päättyy tänään",
    daysRemainingOne: "1 päivä jäljellä",
    daysRemaining: (days: number) => `${days} päivää jäljellä`,
    startsOn: (date: string) => `Alkaa ${date}`,
    indefinite: "Toistaiseksi",
  },
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
