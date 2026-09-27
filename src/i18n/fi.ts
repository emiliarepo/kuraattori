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
      home: "Koti",
      browse: "Selaa",
      mine: "Omat",
      profile: "Profiili",
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
  auth: {
    signInLink: "Kirjaudu sisään",
    signOut: "Kirjaudu ulos",
    signIn: {
      title: "Kirjaudu sisään",
      google: "Jatka Googlella",
      devHeading: "Kehitystila",
      devEmailLabel: "Sähköposti",
      devNameLabel: "Nimi",
      devSubmit: "Kirjaudu kehityskäyttäjänä",
    },
  },
  onboarding: {
    title: "Tervetuloa",
    interestsHeading: "Mitkä aiheet kiinnostavat?",
    regionsHeading: "Mistä alueista haluat näyttelyitä?",
    skip: "Ohita",
    next: "Seuraava",
    finish: "Valmis",
  },
  profile: {
    title: "Profiili",
    interestsHeading: "Kiinnostuksen kohteet",
    regionsHeading: "Alueet",
  },
} as const;
