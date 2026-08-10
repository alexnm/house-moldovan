import type { ImageMetadata } from "astro";

const assetModules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/romania/**/*.{jpg,jpeg,jpe,png,JPG}",
  { eager: true },
);

const assetByKey = new Map(
  Object.entries(assetModules).map(([key, mod]) => [key, mod.default] as const),
);

const rangeRelativeToAssets = /^\.\.\/\.\.\/assets\//;

/**
 * Turn a range frontmatter path (relative to `src/content/ranges/*.md`, e.g.
 * `../../assets/romania/fagaras/cover.png`) into metadata for `astro:assets` `Image`.
 */
export const rangeCoverFromFrontmatterPath = (
  cover: string | undefined,
): ImageMetadata | undefined => {
  if (!cover) return;
  const key = cover.replace(rangeRelativeToAssets, "../assets/");
  return assetByKey.get(key);
};
