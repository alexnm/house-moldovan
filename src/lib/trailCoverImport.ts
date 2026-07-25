import type { ImageMetadata } from "astro";

/** Eager map from `src/lib` — keys like `../assets/romania/fagaras/cover.png`. */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/romania/**/cover.{jpg,jpeg,png}",
  { eager: true },
);

const trailRelativeToAssets = /^\.\.\/\.\.\/assets\//;

/**
 * Turn a trail frontmatter path (relative to `src/content/trails/*.md`, e.g.
 * `../../assets/romania/fagaras/cover.png`) into metadata for `astro:assets` `Image`.
 */
export const trailCoverFromFrontmatterPath = (
  cover: string | undefined,
): ImageMetadata | undefined => {
  if (!cover) return;
  const key = cover.replace(trailRelativeToAssets, "../assets/");
  return modules[key]?.default;
};
