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

/**
 * A map pin. Articles can list several so an itinerary (or multi-stop story)
 * can cover every place it visits.
 */
export const mapCoordinate = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Optional place name for the pin, e.g. "Petra" or "Tel Aviv". */
  label: z.string().min(1).optional(),
});

const regions = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/regions" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      tagline: z.string(),
      intro: z.string(),
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
    /** Relative to the place file, e.g. `../../assets/japan/gokayama-thumb.jpg`. Card / portrait. Falls back to cover. */
    thumbnail: z.string().optional(),
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
      /** Map pins for places this article covers (empty = not on the map yet). */
      coordinates: z.array(mapCoordinate).default([]),
      featured: z.boolean().default(false),
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
      /** Map pins for places this article covers (empty = not on the map yet). */
      coordinates: z.array(mapCoordinate).default([]),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const itineraryLocation = z.object({
  label: z.string(),
  country: reference("places"),
});

const itineraryDay = z.object({
  description: z.string(),
  locations: z.array(itineraryLocation).min(1),
});

const itineraries = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/itineraries" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: articleSummary,
      highlights: z.array(z.string()).min(1),
      travelTips: z.array(z.string()).min(1),
      days: z.array(itineraryDay).min(1),
      country: z.array(reference("places")).min(1),
      /** e.g. "March–April" or "December–March, July–August" */
      months: z.string().min(1),
      published: z.coerce.date(),
      hero: image(),
      /** Map pins for every stop this itinerary covers. */
      coordinates: z.array(mapCoordinate).default([]),
      featured: z.boolean().default(false),
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
