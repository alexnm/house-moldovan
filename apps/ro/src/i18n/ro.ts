export const ro = {
  locale: "ro" as const,
  htmlLang: "ro",
  intlLocale: "ro-RO",
  siteName: "Pe creste",
  tagline: "Idei de drumeții în munții României",
  description:
    "O selecție de trasee în munții României însoțite de toate detaliile tehnice necesare pentru parcurgerea lor.",
  nav: {
    home: "Acasă",
    trasee: "Trasee",
    harta: "Harta",
    en: "English journal",
  },
  home: {
    featuredKicker: "Tura săptămânii",
    rangesHeading: "Explorează masivele muntoase",
    recentHeading: "Ultimele trasee",
    seeAll: "Toate traseele",
    exploreAll: "Explorează traseele",
    aboutKicker: "Despre noi",
    aboutHeading: "HouseMoldovan la munte",
    rangesListLabel: "Masive pe hartă",
    rangesListHint: "Explorează zonele geografice",
    // The two levels the way out leads back to, one per step.
    allRanges: "Toate masivele",
    backToRange: "Înapoi la masiv",
  },
  feed: {
    title: "Cele mai noi trasee",
    intro: "Caută un traseu",
    filterRange: "Zonă",
    filterDifficulty: "Dificultate",
    filterSeason: "Anotimp",
    filterShape: "Formă",
    filterAll: "Toate",
    filtersLabel: "Filtre trasee",
    empty: "Niciun traseu nu corespunde filtrului.",
  },
  harta: {
    title: "Harta traseelor",
    intro: "Toate traseele din munții României, pe o singură hartă.",
  },
  range: {
    countOf: (n: number) =>
      n === 1 ? "1 traseu" : n < 20 ? `${n} trasee` : `${n} de trasee`,
    intro: (name: string) => `Toate traseele descrise în masivul ${name}.`,
    traseeHeading: (name: string) => `Trasee din ${name}`,
  },
  difficulty: {
    usor: "Ușor",
    mediu: "Mediu",
    dificil: "Dificil",
    tehnic: "Tehnic",
  },
  shape: {
    "dus-intors": "Dus-întors",
    circuit: "Circuit",
    traversare: "Traversare",
  },
  season: {
    primavara: "Primăvară",
    vara: "Vară",
    toamna: "Toamnă",
    iarna: "Iarnă",
  },
  hike: {
    distance: "Distanță",
    elevationGain: "Diferență de nivel",
    summit: "Altitudine maximă",
    duration: "Durată estimată",
    waymark: "Marcaje",
    season: "Anotimp recomandat",
    difficulty: "Nivel dificultate",
    shape: "Tip traseu",
    trailhead: "Punct de plecare",
    range: "Masiv",
    stats: "Detalii traseu",
    profile: "Profil de elevație",
    profileKeyboard:
      "Folosește săgețile stânga și dreapta pentru a parcurge profilul.",
    mapCaption: "Traseu pe hartă",
    gpxDownload: "Descarcă GPX",
    backToFeed: "Înapoi la trasee",
    nextRead: "Următorul traseu",
  },
  notFound: {
    metaTitle: "Pagina nu există",
    metaDescription:
      "Pagina asta nu e pe harta noastră. Întoarce-te la Pe creste și alege un traseu sau un masiv.",
    heroTitle: "Ai ieșit de pe traseu",
    heroSummary:
      "Poate fi un link vechi sau o adresă scrisă greșit. Folosește meniul de navigare pentru a ajunge la pagina principală.",
    homeCta: "Înapoi acasă",
  },
  units: {
    km: "km",
    m: "m",
    hours: "h",
    distance: (km: number) =>
      km < 1
        ? `${Math.round(km * 1000)} m`
        : `${km.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} km`,
    elevation: (m: number) => `${Math.round(m).toLocaleString("ro-RO")} m`,
    duration: (range: readonly [number, number]) => {
      const [a, b] = range;
      const fmt = (h: number): string => {
        const hours = Math.floor(h);
        const minutes = Math.round((h - hours) * 60);
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${String(minutes).padStart(2, "0")}\u00B4`;
      };
      return a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`;
    },
  },
  date: {
    long: (d: Date) =>
      d.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    short: (d: Date) =>
      d.toLocaleDateString("ro-RO", { month: "short", year: "numeric" }),
  },
  rss: {
    title: "Pe creste",
    description: "Drumeții în munții României",
  },
  footer: {
    rights: "Fotografiile și textul aparțin autorului.",
    themeLight: "Mod luminos",
    themeDark: "Mod întunecat",
    instagramLabel: "Instagram",
    instagramUrl: "https://www.instagram.com/housemoldovan/",
    rssLabel: "Abonare RSS",
    enCta: "housemoldovan.com",
    enKicker: "Vizitați blogul nostru de călătorie în limba engleză",
  },
} as const;

export type RoStrings = typeof ro;
