import type { ImageMetadata } from "astro";

const assetModules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/romania/**/*.{jpg,jpeg,jpe,png,JPG}",
  { eager: true },
);

const assetByKey = new Map(
  Object.entries(assetModules).map(([key, mod]) => [key, mod.default] as const),
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
  return assetByKey.get(key);
};
