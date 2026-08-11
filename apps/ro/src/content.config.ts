import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";
import { WAYMARK_CODES } from "~/lib/waymarks";

export const SEASONS_RO = ["primavara", "vara", "toamna", "iarna"] as const;
export const DIFFICULTIES_RO = ["usor", "mediu", "dificil", "tehnic"] as const;
export const HIKE_SHAPES = ["dus-intors", "circuit", "traversare"] as const;

/** One-line hook for cards, heroes, and RSS. */
export const articleSummary = z.string().min(1).max(200);

const ranges = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/ranges" }),
  schema: z.object({
    name: z.string(),
    crest: z.string().optional(),
    summary: z.string().optional(),
    /** Relative to the range file, e.g. `../../assets/romania/{slug}/cover.jpg`. */
    cover: z.string().optional(),
    /** Tall crop for the home atlas wall. Same path form as `cover`. */
    atlas: z.string().optional(),
  }),
});

const hikes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/hikes" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: articleSummary,
      published: z.coerce.date(),
      range: reference("ranges"),
      trailhead: z.object({
        name: z.string(),
        url: z.string().url().optional(),
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
  ranges,
  hikes,
};
