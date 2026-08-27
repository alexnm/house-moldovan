export const en = {
  locale: "en" as const,
  htmlLang: "en",
  intlLocale: "en-GB",
  siteName: "House Moldovan",
  description:
    "A photographic travel journal with stories, itineraries and spotlights from our travels around the world",
  nav: {
    journal: "Journal",
    explore: "Explore",
    stories: "Stories",
    spotlights: "Spotlights",
    itineraries: "Itineraries",
    about: "About",
    ro: "Hiking in Romania",
    openMenu: "Open menu",
  },
  home: {
    kicker: "Travel journal",
    regionsHeading: "Explore by region",
    countriesHeading: "Featured destinations",
    recentHeading: "Recent journal notes",
    exploreCta: "See all regions",
    featuredCta: "See all countries",
    seeAll: "See entire journal",
    about: {
      heading: "The family travel journal",
      cta: "More about us",
      portraitAlt: "Alex and Mela on a hillside overlooking the coast",
    },
  },
  journal: {
    title: "Journal",
    metaDescription:
      "The complete House Moldovan travel journal: every story, photo spotlight and multi-day itinerary from our trips across South America, Asia, the Middle East and Europe.",
    intro: "Latest journal notes",
    featuredKicker: {
      story: "Featured story",
      spotlight: "Featured spotlight",
      itinerary: "Featured itinerary",
    },
    seeEntire: "See entire journal",
    empty:
      "No notes match this filter. Try Stories, Spotlights, or Itineraries above.",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
  },
  storiesIndex: {
    metaTitle: "Travel stories & travel guides",
    intro: "Dedicated travel guides about a place we visited",
  },
  spotlightsIndex: {
    metaTitle: "Photo spotlights from around the world",
    intro: "Photo highlights capturing a place or an experience",
  },
  itinerariesIndex: {
    metaTitle: "Multi-day travel itineraries",
    intro: "Multi-day trips across different locations",
  },
  explore: {
    title: "Explore the world",
    sub: "Start from a region, find a country, and read the journal notes related to it.",
    regionsNav: "Jump to region",
    viewRegion: (name: string) => `Explore ${name}`,
  },
  places: {
    countOf: (n: number) => `${n} ${n === 1 ? "note" : "notes"}`,
    noStoriesYet: "No notes from here yet.",
    backToExplore: "Back to Explore",
    storiesHeading: (name: string) => `Travel guides from ${name}`,
    locationsHeading: "Explore the places",
  },
  region: {
    /** Meta label on articles (not the chapter stamp). */
    kicker: "Region",
    chapter: (order: number) => `Chapter - 0${order}`,
    countriesHeading: "Explore by country",
    routesHeading: "Routes across borders",
    storiesHeading: (name: string) => `Travel guides from ${name}`,
    backToExplore: "All regions",
    openCountry: (name: string) => `Open ${name}`,
  },
  about: {
    title: "About",
    kicker: "About",
    heroTitle: "House Moldovan",
    heroSummary: "A few words about us and our travel journal",
    notesKicker: "What's in the journal",
    notesHeading: "The journal",
    notes: {
      stories: {
        title: "Stories",
        description:
          "Travel guides about a place we visited or an experience we had.",
        href: "/stories",
        cta: "Read stories",
      },
      spotlights: {
        title: "Spotlights",
        description: "Photo-first pieces that capture a mood or a single day.",
        href: "/spotlights",
        cta: "Browse spotlights",
      },
      itineraries: {
        title: "Itineraries",
        description:
          "Multi-day routes across cities and borders, with day-by-day plans.",
        href: "/itineraries",
        cta: "See itineraries",
      },
    },
    melaAlt: "Mela on a stone bridge in Bruges",
    alexAlt: "Alex carrying Edi on his shoulders in the Dolomites",
    melaAlexAlt: "The whole family walking on a path",
    exploreCta: "Start exploring",
    journalCta: "Read the journal",
  },
  article: {
    story: "Story",
    spotlight: "Spotlight",
    itinerary: "Itinerary",
    published: "Published",
    days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    country: "Country",
    countries: "Countries",
    months: "Best months",
    type: "Destination type",
    storyType: {
      culture: "Cultural",
      nature: "Nature",
      "city-break": "City break",
      beach: "Beach",
      hiking: "Hiking",
    },
    backToJournal: "Back to the journal",
    moreFrom: (place: string) => `More from ${place}`,
    nextRead: "Continue reading",
    itineraryHighlights: "Highlights",
    itineraryTravelTips: "Quick tips",
    onThisPage: "On this page",
  },
  units: {
    km: "km",
    m: "m",
    distance: (km: number) =>
      km < 1
        ? `${Math.round(km * 1000)} m`
        : `${km.toLocaleString("en-GB", { maximumFractionDigits: 1 })} km`,
  },
  date: {
    long: (d: Date) =>
      d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    short: (d: Date) =>
      d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
  },
  rss: {
    title: "House Moldovan",
    description:
      "Latest stories, spotlights and itineraries across four regions.",
  },
  notFound: {
    metaTitle: "Page not found",
    metaDescription:
      "This page isn't on our map, head back to House Moldovan and pick a story, spotlight, or itinerary from the journal.",
    heroTitle: "Off the map",
    heroSummary:
      "You've wandered down a path we never wrote. A wrong turn at a crossroads, a bookmark gone stale, or maybe a URL typo. No country, story, or itinerary lives here.",
    homeCta: "Back home",
  },
  footer: {
    rights: "All photographs and writing belong to the author.",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    aboutUs: "About us",
    instagramLabel: "Instagram",
    instagramUrl: "https://www.instagram.com/housemoldovan/",
    subscribeLabel: "Subscribe",
    rssLabel: "Subscribe via RSS",
    roCta: "pecreste.ro",
    roKicker: "Visit our sister website for hiking in Romania",
  },
} as const;

export type EnStrings = typeof en;
