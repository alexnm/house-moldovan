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
      /** Contact-sheet photos for the region hero (first four used). */
      images: z.array(image()).min(1),
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
