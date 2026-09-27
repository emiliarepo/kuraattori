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
  pages: {
    signIn: {
      cta: "Kirjaudu sisään",
      home: "Kirjaudu sisään nähdäksesi sinulle poimitut näyttelyt.",
      status: "Kirjaudu sisään merkitäksesi tämän näyttelyn.",
      my: "Kirjaudu sisään nähdäksesi omat näyttelysi.",
    },
    home: {
      endingSoon: "Päättyy pian",
      forYou: "Sinulle",
      new: "Uudet näyttelyt",
      upcoming: "Tulossa",
      whyNew: "Uusi",
    },
    browse: {
      title: "Selaa",
      filters: "Suodattimet",
      openFilters: "Suodata",
      closeFilters: "Sulje",
      applyFilters: "Näytä tulokset",
      resetFilters: "Tyhjennä suodattimet",
      search: "Hae",
      searchPlaceholder: "Näyttely, museo tai kaupunki",
      state: "Tila",
      stateCurrent: "Käynnissä",
      stateUpcoming: "Tulossa",
      city: "Kaupunki",
      allCities: "Kaikki kaupungit",
      museums: "Museot",
      categories: "Aiheet",
      museumCardOnly: "Vain Museokortti-näyttelyt",
      endingWithin: "Päättyy pian",
      endingWithinDays: (days: number) => `${days} päivän sisällä`,
      endingWithinAny: "Milloin tahansa",
      loadMore: "Näytä lisää",
      loading: "Ladataan…",
      empty: "Ei näyttelyitä näillä suodattimilla.",
    },
    detail: {
      museum: "Museo",
      city: "Kaupunki",
      open: "Avoinna",
      museumCard: "Museokortti",
      noMuseumCard: "Ei Museokorttia",
      source: "Lähde museot.fi:ssä",
    },
    museums: {
      title: "Museot",
      current: "Käynnissä",
      upcoming: "Tulossa",
      past: "Päättyneet",
      empty: "Ei näyttelyitä.",
    },
    my: {
      interested: "Kiinnostavat",
      visited: "Käydyt",
      hidden: "Piilotetut",
      emptyInterested: "Ei kiinnostavia näyttelyitä vielä.",
      emptyVisited: "Ei käytyjä näyttelyitä vielä.",
      emptyHidden: "Ei piilotettuja näyttelyitä.",
    },
    timeBar: {
      daysCompact: (days: number) => `${days} pv`,
      ended: (date: string) => `Päättyi ${date}`,
    },
    days: {
      caption: (days: number) => (days === 1 ? "päivä" : "päivää"),
    },
    updated: (date: string) => `Tiedot päivitetty ${date}`,
    updatedUnknown: "Tietoja ei ole vielä päivitetty.",
    error: {
      title: "Jokin meni pieleen",
      body: "Sivun lataaminen epäonnistui. Yritä hetken kuluttua uudelleen.",
      retry: "Yritä uudelleen",
    },
    notFound: {
      title: "Sivua ei löytynyt",
      body: "Etsimääsi sivua ei ole, tai se on poistettu.",
      home: "Etusivulle",
    },
    meta: {
      home: "Näyttelyt suomalaisissa museoissa: selaa, tallenna kiinnostavat ja seuraa milloin ne päättyvät.",
      browse:
        "Selaa käynnissä ja tulevia näyttelyitä alueen, museon, aiheen ja Museokortin mukaan.",
      museums: "Museot ja niiden näyttelyt.",
    },
  },
} as const;
