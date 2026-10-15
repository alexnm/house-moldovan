import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";
import { ACCENTS } from "@shared/lib/accent";

export const STORY_DESTINATION_TYPES = [
  "culture",
  "nature",
  "city-break",
  "beach",
  "hiking",
] as const;

/** One-line hook for cards, heroes, and RSS (stories, spotlights, itineraries). */
export const articleSummary = z.string().min(1).max(200);

/** A named place within a country — coordinates live here, not on articles. */
export const countryLocation = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Relative to the place file, e.g. `../../assets/jordan/petra.jpg`. */
  image: z.string().optional(),
  /** A few sentences shown when the location is opened on the country map. */
  summary: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Globally unique location reference: `{countryId}/{locationId}`. */
export const locationRef = z.string().min(1);

/** Contact-sheet photo for country snapshot grids. */
export const placeSnapshot = z.object({
  /** Relative to the place file, e.g. `../../assets/jordan/petra.jpg`. */
  image: z.string().min(1),
  /** Location id (`jordan/petra`) or a display override when the shot has no catalog entry. */
  location: z.string().min(1),
  /** Alt text; falls back to the resolved location label. */
  caption: z.string().min(1).optional(),
});

const regions = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/regions" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      tagline: z.string(),
      accent: z.enum(ACCENTS),
      order: z.number().int().positive(),
      /** Photo on the homepage region tile. */
      cardImage: image(),
      /** Story pinned as the region's featured story. Falls back to the latest story in the region. */
      featured: reference("stories").optional(),
      /** Wide photo beside the region card on the Explore page. */
      banner: image().optional(),
      /** Where the banner was taken, e.g. "Gardens by the Bay, Singapore". */
      bannerLocation: z.string().optional(),
      /** Optional: slide the desktop hero map right (+) or left (−), in px at a 1312px wide hero. */
      heroShift: z.number().optional(),
      /** Optional: slide the desktop hero map down (+) or up (−), in px at a 1312px wide hero. */
      heroShiftY: z.number().optional(),
      /** Places pinned on the region hero map, each with a photo taken there. */
      highlights: z
        .array(
          z.object({
            /** Short place name, used for the pin label, e.g. "Kyoto". */
            place: z.string(),
            /** Added to the photo caption, e.g. "Kyoto, Japan". Leave out for city-states. */
            country: z.string().optional(),
            image: image(),
            /** [latitude, longitude] */
            coords: z.tuple([z.number(), z.number()]),
            /**
             * Where the photo sits on the desktop hero map: its top-left corner
             * as [x, y] px from the pin (at a 1312px wide hero). Leave out to
             * place it automatically.
             */
            photoOffset: z.tuple([z.number(), z.number()]).optional(),
          }),
        )
        .default([]),
    }),
});

const places = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/places" }),
  schema: z.object({
    name: z.string(),
    /** Short label for cards and links, e.g. UAE. Falls back to name when omitted. */
    shortName: z.string().optional(),
    /** Unicode flag, e.g. 🇯🇵 (shown in country lists). */
    flag: z.string(),
    region: reference("regions"),
    /** One-line hook, e.g. on country cards and headers. */
    tagline: z.string(),
    accent: z.enum(ACCENTS).optional(),
    /** Relative to the place file, e.g. `../../assets/japan/cover.jpg`. Hero / landscape. */
    cover: z.string().optional(),
    /** Cover photo location: a location id (`jordan/wadi-rum`) or a display override when the shot has no catalog entry. */
    coverLocation: z.string().min(1).optional(),
    /** Relative to the place file, e.g. `../../assets/japan/gokayama-thumb.jpg`. Card / portrait. Falls back to cover. */
    thumbnail: z.string().optional(),
    /** Named places within this country. Referenced by articles as `{countryId}/{id}`. */
    locations: z.array(countryLocation).default([]),
    /** Optional contact-sheet for the country page snapshot grid. */
    snapshots: z.array(placeSnapshot).default([]),
    /** Headline on the country page "At a glance" card. */
    headline: z.string().optional(),
    /**
     * Standard country facts beside the intro. Region comes from `region`; the
     * page renders the set in a fixed order and skips any field left out.
     */
    facts: z
      .object({
        population: z.string().min(1),
        capital: z.string().min(1),
        language: z.string().min(1),
        currency: z.string().min(1),
        timeZone: z.string().min(1),
        plugType: z.string().min(1),
        driving: z.enum(["left", "right"]),
        /** A few trip categories, e.g. ["Food", "Hiking", "Cities"]. */
        bestFor: z.array(z.string().min(1)).max(5),
        bestTime: z.string().min(1),
      })
      .partial()
      .default({}),
    /** Country name in the local language, e.g. "日本". Stamped beside the English name when it differs enough. */
    localName: z.string().min(1).optional(),
    /** Stamp the local name even when it's close to the English one (`true`), or never (`false`). */
    stampLocalName: z.boolean().optional(),
    /** Our trips here, oldest first; each becomes a passport stamp on the "At a glance" card. */
    visits: z
      .array(
        z.object({
          year: z.number().int().min(1990).max(2100),
          /** Short stamp line, e.g. "14 days" or "Barcelona". */
          label: z.string().min(1).max(24).optional(),
        }),
      )
      .default([]),
    /** Show the country page map section (still requires ≥2 locations). */
    showMap: z.boolean().default(false),
    /** Hidden from explore, nav, and region lists until ready to publish. */
    draft: z.boolean().default(false),
  }),
});

const stories = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/stories" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: articleSummary,
      country: z.array(reference("places")).min(1),
      published: z.coerce.date(),
      hero: image(),
      type: z.enum(STORY_DESTINATION_TYPES),
      /** e.g. "March–April" (same free-form string as itineraries) */
      months: z.string().min(1),
      /** Map pins — location ids from country entries (empty = not on the map yet). */
      locations: z.array(locationRef).default([]),
      /** Hero photo location id, e.g. `jordan/petra`. Defaults to the first pin. */
      heroLocation: locationRef.optional(),
      draft: z.boolean().default(false),
    }),
});

const spotlights = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/spotlights" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: articleSummary,
      country: z.array(reference("places")).min(1),
      published: z.coerce.date(),
      hero: image(),
      photos: z
        .array(
          z.object({
            image: image(),
            caption: z.string(),
            tagline: z.string(),
          }),
        )
        .min(1),
      type: z.enum(STORY_DESTINATION_TYPES),
      months: z.string().min(1),
      /** Map pins — location ids from country entries (empty = not on the map yet). */
      locations: z.array(locationRef).default([]),
      /** Hero photo location id, e.g. `jordan/petra`. Defaults to the first pin. */
      heroLocation: locationRef.optional(),
      draft: z.boolean().default(false),
    }),
});

const itineraryDay = z.object({
  description: z.string(),
  /** Location ids for this day, e.g. `jordan/petra`. */
  locations: z.array(locationRef).min(1),
});

const transportMode = z.enum(["car", "bus", "train", "ferry", "plane"]);

const itineraries = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/itineraries" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: articleSummary,
      /** Four photos. The place name is the caption. */
      highlights: z
        .array(
          z.object({
            image: image(),
            /** Location id, e.g. `jordan/petra`. The place name is the caption. */
            location: locationRef,
            /** Shown instead of the location name. */
            title: z.string().min(1).optional(),
          }),
        )
        .length(4),
      /** Short paragraph for the trip card. Empty until written. */
      why: z.string().default(""),
      /** How you move between stops. One mode, or several. */
      gettingAround: z.union([transportMode, z.array(transportMode).min(1)]),
      /** Overnight stays, in order. Each one opens the route list. */
      bases: z
        .array(
          z
            .object({
              /** Where you stay, e.g. `austria/salzburg`. */
              location: locationRef,
              /** Shown instead of the location name. */
              title: z.string().min(1).optional(),
              /** Card photo. Falls back to the location's picture. */
              image: image().optional(),
              /** How you travel from this base to the next one. */
              toNext: transportMode.optional(),
              /**
               * A return point with no nights of its own. The path links back
               * here, but it is not listed or counted as a base.
               */
              hidden: z.boolean().default(false),
              days: z.array(itineraryDay).default([]),
            })
            .refine((base) => base.hidden || base.days.length > 0, {
              message: "A base needs at least one day",
              path: ["days"],
            }),
        )
        .min(1),
      country: z.array(reference("places")).min(1),
      /** e.g. "March–April" or "December–March, July–August" */
      months: z.string().min(1),
      published: z.coerce.date(),
      hero: image(),
      /** Hero photo location id, e.g. `jordan/petra`. Defaults to the first stop. */
      heroLocation: locationRef.optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = {
  regions,
  places,
  stories,
  spotlights,
  itineraries,
};
