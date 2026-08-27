import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import type { Region } from "~/lib/regions";
import { regionIdFromPlace } from "~/lib/regions";

const notDraft = <T extends "stories" | "spotlights" | "itineraries">(
  e: CollectionEntry<T>,
): boolean => e.data.draft !== true;

const byPublishedDesc = (
  a: CollectionEntry<"stories" | "spotlights" | "itineraries">,
  b: CollectionEntry<"stories" | "spotlights" | "itineraries">,
): number => b.data.published.getTime() - a.data.published.getTime();

export const getStories = async (): Promise<CollectionEntry<"stories">[]> => {
  const all = await getCollection("stories");
  return all.filter(notDraft).sort(byPublishedDesc);
};

export const getSpotlights = async (): Promise<
  CollectionEntry<"spotlights">[]
> => {
  const all = await getCollection("spotlights");
  return all.filter(notDraft).sort(byPublishedDesc);
};

export const getItineraries = async (): Promise<
  CollectionEntry<"itineraries">[]
> => {
  const all = await getCollection("itineraries");
  return all.filter(notDraft).sort(byPublishedDesc);
};

export type AnyEnArticle =
  | (CollectionEntry<"stories"> & { kind: "story" })
  | (CollectionEntry<"spotlights"> & { kind: "spotlight" })
  | (CollectionEntry<"itineraries"> & { kind: "itinerary" });

/** Primary country anchor for cards, map pins, and feeds. */
export const primaryCountryFromArticle = (
  a: AnyEnArticle,
): { collection: "places"; id: string } => {
  return a.data.country[0]!;
};

/** Countries an article is filed under (order preserved, unique list in content). */
export const countryRefsFromArticle = (
  a: AnyEnArticle,
): { collection: "places"; id: string }[] => a.data.country;

export const getEnFeed = async (): Promise<AnyEnArticle[]> => {
  const [stories, spotlights, itineraries] = await Promise.all([
    getStories(),
    getSpotlights(),
    getItineraries(),
  ]);
  const out: AnyEnArticle[] = [
    ...stories.map((e) => ({ ...e, kind: "story" as const })),
    ...spotlights.map((e) => ({ ...e, kind: "spotlight" as const })),
    ...itineraries.map((e) => ({ ...e, kind: "itinerary" as const })),
  ];
  return out.sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  );
};

export const getFeaturedEnArticle = async (): Promise<
  AnyEnArticle | undefined
> => {
  const feed = await getEnFeed();
  return feed.find((a) => a.data.featured) ?? feed[0];
};

/** Home uses a static brand hero — keep the featured note in the recent grid. */
export const getHomeRecentFeed = (
  feed: AnyEnArticle[],
  limit = 7,
): AnyEnArticle[] => {
  const featured = feed.find((a) => a.data.featured);
  const newest = feed.slice(0, limit);
  if (!featured || newest.some((a) => a.id === featured.id)) {
    return newest;
  }
  return [
    featured,
    ...feed.filter((a) => a.id !== featured.id).slice(0, limit - 1),
  ];
};

export const getPlace = async (
  ref: { collection: "places"; id: string } | string,
): Promise<CollectionEntry<"places"> | undefined> => {
  if (typeof ref === "string") {
    return await getEntry("places", ref);
  }
  return await getEntry(ref);
};

export const getAllPlaces = async (): Promise<CollectionEntry<"places">[]> =>
  await getCollection("places");

export const regionByPlaceIdMap = (
  places: CollectionEntry<"places">[],
): Map<string, Region> =>
  new Map(places.map((p) => [p.id, regionIdFromPlace(p)] as const));

export const countriesForRegion = (
  places: CollectionEntry<"places">[],
  region: Region,
): CollectionEntry<"places">[] =>
  places
    .filter((p) => regionIdFromPlace(p) === region)
    .sort((a, b) => a.data.name.localeCompare(b.data.name));

export const articleMatchesRegion = (
  article: AnyEnArticle,
  region: Region,
  regionByPlaceId: Map<string, Region>,
): boolean => {
  for (const ref of countryRefsFromArticle(article)) {
    if (regionByPlaceId.get(ref.id) === region) return true;
  }
  return false;
};

export const articlesForRegion = (
  feed: AnyEnArticle[],
  region: Region,
  regionByPlaceId: Map<string, Region>,
): AnyEnArticle[] =>
  feed.filter((a) => articleMatchesRegion(a, region, regionByPlaceId));

/** Hand-picked home destinations, in display order. */
export const FEATURED_COUNTRY_IDS = [
  "japan",
  "argentina",
  "jordan",
  "malaysia",
] as const;

export const getFeaturedCountries = (
  places: CollectionEntry<"places">[],
  ids: readonly string[] = FEATURED_COUNTRY_IDS,
): CollectionEntry<"places">[] => {
  const byId = new Map(places.map((p) => [p.id, p] as const));
  const out: CollectionEntry<"places">[] = [];
  for (const id of ids) {
    const place = byId.get(id);
    if (place) out.push(place);
  }
  return out;
};
