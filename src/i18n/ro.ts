export const ro = {
  locale: "ro" as const,
  htmlLang: "ro",
  intlLocale: "ro-RO",
  siteName: "Pe creastă",
  tagline: "Drumeții în munții României",
  description:
    "Trasee, ture și note de pe creste: profil de elevație, refugii și marcaje. În limba română.",
  nav: {
    home: "Acasă",
    trasee: "Trasee",
    munti: "Munți",
    despre: "Despre",
    en: "English journal",
  },
  home: {
    featuredKicker: "Tura săptămânii",
    rangesHeading: "Explorează masivele muntoase",
    recentHeading: "Ultimele trasee",
    seeAll: "Toate traseele",
    seasonHeading: "După anotimp",
  },
  feed: {
    title: "Toate traseele",
    intro: "Explorează traseele din munții României.",
    filterRange: "Masiv",
    filterDifficulty: "Dificultate",
    filterSeason: "Anotimp",
    filterShape: "Formă",
    empty: "Niciun traseu nu corespunde filtrului.",
  },
  range: {
    countOf: (n: number) =>
      n === 1 ? "1 traseu" : n < 20 ? `${n} trasee` : `${n} de trasee`,
    intro: (name: string) => `Toate traseele descrise în masivul ${name}.`,
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
    elevation: "Diferență de nivel",
    elevationGain: "Urcare",
    elevationLoss: "Coborâre",
    summit: "Cota maximă",
    duration: "Durată estimată",
    waymark: "Marcaj",
    season: "Anotimp recomandat",
    difficulty: "Dificultate",
    shape: "Formă traseu",
    trailhead: "Punct de plecare",
    trailheadAccess: "Acces",
    profile: "Profil de elevație",
    mapCaption: "Traseu pe hartă",
    gpxDownload: "Descarcă GPX",
    backToFeed: "Înapoi la trasee",
    inRange: (name: string) => `Mai mult din ${name}`,
    nextRead: "Următorul traseu",
  },
  about: {
    title: "Despre",
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
        if (minutes === 0) return `${hours} h`;
        return `${hours} h ${String(minutes).padStart(2, "0")}\u00B4`;
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
    title: "Pe creastă",
    description: "Trasee și ture din munții României.",
  },
  footer: {
    rights: "Fotografiile și textul aparțin autorului.",
    themeLight: "Mod luminos",
    themeDark: "Mod întunecat",
    rssLabel: "Abonare RSS",
    enCta: "English travel journal",
    enKicker: "Site sister în engleză",
  },
} as const;

export type RoStrings = typeof ro;
