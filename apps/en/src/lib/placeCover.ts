import type { ImageMetadata } from "astro";
import type { CollectionEntry } from "astro:content";
import type { AnyEnArticle } from "~/lib/content";
import { countryRefsFromArticle } from "~/lib/content";

const placeRelativeToAssets = /^\.\.\/\.\.\/assets\//;

const assetModules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/**/*.{jpg,jpeg,jpe,png,JPG}",
  { eager: true },
);

const assetByKey = new Map(
  Object.entries(assetModules).map(([key, mod]) => [key, mod.default] as const),
);

export const placeCoverFromFrontmatterPath = (
  hero: string | undefined,
): ImageMetadata | undefined => {
  if (!hero) return;
  const key = hero.replace(placeRelativeToAssets, "../assets/");
  return assetByKey.get(key);
};

export const requirePlaceCoverFromFrontmatter = (
  place: CollectionEntry<"places">,
): ImageMetadata => {
  const { cover } = place.data;
  if (!cover) {
    throw new Error(`Place "${place.id}" is missing \`cover\` in frontmatter`);
  }
  const image = placeCoverFromFrontmatterPath(cover);
  if (!image) {
    throw new Error(
      `Place "${place.id}" cover "${cover}" does not resolve to an asset under src/assets`,
    );
  }
  return image;
};

const thumbPattern = /(?:^|-)thumb\.(jpg|jpeg|jpe|png|JPG)$/i;

const imagesInPlaceFolder = (placeId: string) => {
  const prefix = `../assets/${placeId}/`;
  return [...assetByKey.keys()].filter((k) => k.startsWith(prefix));
};

const defaultCoverFromAssets = (placeId: string): ImageMetadata | undefined => {
  const inFolder = imagesInPlaceFolder(placeId);

  const cover = inFolder.find((k) => /\/cover\.(jpg|jpeg|png|JPG)$/i.test(k));
  if (cover) return assetByKey.get(cover);

  const namedCover = inFolder.find((k) =>
    /-cover\.(jpg|jpeg|png|JPG)$/i.test(k),
  );
  if (namedCover) return assetByKey.get(namedCover);

  const first = inFolder.filter((k) => !thumbPattern.test(k)).sort()[0];
  if (first) return assetByKey.get(first);

  return undefined;
};

const defaultThumbnailFromAssets = (
  placeId: string,
): ImageMetadata | undefined => {
  const inFolder = imagesInPlaceFolder(placeId);
  const thumbs = inFolder.filter((k) => thumbPattern.test(k)).sort();
  const thumb = thumbs[0];
  if (thumb) return assetByKey.get(thumb);
  return undefined;
};

const coverFromArticles = (
  placeId: string,
  articles: AnyEnArticle[],
): ImageMetadata | undefined => {
  for (const article of articles) {
    if (countryRefsFromArticle(article).some((r) => r.id === placeId)) {
      return article.data.hero;
    }
  }
  return undefined;
};

export const placeCoverForCountry = (
  place: CollectionEntry<"places">,
  articles: AnyEnArticle[],
): ImageMetadata | undefined =>
  placeCoverFromFrontmatterPath(place.data.cover) ??
  coverFromArticles(place.id, articles) ??
  defaultCoverFromAssets(place.id);

export const placeThumbnailForCountry = (
  place: CollectionEntry<"places">,
  articles: AnyEnArticle[],
): ImageMetadata | undefined =>
  placeCoverFromFrontmatterPath(place.data.thumbnail) ??
  defaultThumbnailFromAssets(place.id) ??
  placeCoverForCountry(place, articles);
