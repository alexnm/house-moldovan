import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";
import { ACCENTS } from "./lib/accent";
import { WAYMARK_CODES } from "./lib/waymarks";

export const STORY_DESTINATION_TYPES = [
  "culture",
  "nature",
  "city-break",
  "beach",
  "hiking",
] as const;
export const SEASONS_RO = ["primavara", "vara", "toamna", "iarna"] as const;

export const DIFFICULTIES_RO = ["usor", "mediu", "dificil", "tehnic"] as const;
export const HIKE_SHAPES = ["dus-intors", "circuit", "traversare"] as const;

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

const trails = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/trails" }),
  schema: z.object({
    name: z.string(),
    accent: z.string().optional(),
    crest: z.string().optional(),
    summary: z.string().optional(),
    /** Relative to the trail file, e.g. `../../assets/romania/{slug}/cover.jpg`. */
    cover: z.string().optional(),
  }),
});

const stories = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/stories" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string().max(200),
      country: z.array(reference("places")).min(1),
      published: z.coerce.date(),
      hero: image(),
      type: z.enum(STORY_DESTINATION_TYPES),
      /** e.g. "March–April" (same free-form string as itineraries) */
      months: z.string().min(1),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const spotlights = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/spotlights" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string().max(120).optional(),
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
      highlights: z.array(z.string()).min(1),
      travelTips: z.array(z.string()).min(1),
      days: z.array(itineraryDay).min(1),
      country: z.array(reference("places")).min(1),
      /** e.g. "March–April" or "December–March, July–August" */
      months: z.string().min(1),
      published: z.coerce.date(),
      hero: image(),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const hikes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/hikes" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      published: z.coerce.date(),
      range: reference("trails"),
      trailhead: z.object({
        name: z.string(),
        access: z.string().optional(),
      }),
      distance: z.number().positive(),
      shape: z.enum(HIKE_SHAPES),
      elevationGain: z.number().nonnegative(),
      summit: z.number().optional(),
      duration: z.tuple([z.number().positive(), z.number().positive()]),
      difficulty: z.enum(DIFFICULTIES_RO),
      waymark: z.array(z.enum(WAYMARK_CODES)).min(1),
      season: z.array(z.enum(SEASONS_RO)).min(1),
      gpx: z.string(),
      hero: image(),
      gallery: z.array(image()).default([]),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

export const collections = {
  regions,
  places,
  trails,
  stories,
  spotlights,
  itineraries,
  hikes,
};
