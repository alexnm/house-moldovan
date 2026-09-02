import type { ImageMetadata } from "astro";
import type { CollectionEntry } from "astro:content";
import type { Accent } from "@shared/lib/accent";
import { articleHref, articleKicker } from "~/lib/articles";
import { countryLine, placeShortName } from "~/lib/articlePlaces";
import {
  articlesForRegion,
  countriesForRegion,
  getAllPlaces,
  getEnFeed,
  getPlace,
  primaryCountryFromArticle,
  regionByPlaceIdMap,
  type AnyEnArticle,
} from "~/lib/content";
import { getCountryShape } from "~/lib/countryShape";
import { qualifiedLocationId } from "~/lib/locations";
import { buildLocationMapPins, type LocationMapPin } from "~/lib/mapPinData";
import { placeThumbnailForCountry } from "~/lib/placeCover";
import { getRegion } from "~/lib/regions";

export type RegionItinerary = {
  id: string;
  href: string;
  title: string;
  summary: string;
  hero: ImageMetadata;
  days: number;
  countries: { id: string; name: string; flag: string }[];
};

export type RegionNote = {
  a: AnyEnArticle;
  href: string;
  kicker: string;
  countryMeta: string;
  accent: Accent;
};

async function regionNoteFromArticle(
  a: AnyEnArticle,
  fallbackAccent: Accent,
): Promise<RegionNote> {
  const primary = await getPlace(primaryCountryFromArticle(a));
  const resolved = (
    await Promise.all(a.data.country.map((ref) => getPlace(ref)))
  ).filter((p): p is CollectionEntry<"places"> => Boolean(p));
  return {
    a,
    href: articleHref(a),
    kicker: articleKicker(a),
    countryMeta: countryLine(resolved),
    accent: primary?.data.accent ?? fallbackAccent,
  };
}

export type RegionCountryLocation = {
  qualifiedId: string;
  name: string;
};

export type RegionCountry = {
  id: string;
  country: CollectionEntry<"places">;
  href: string;
  name: string;
  shortName: string;
  flag: string;
  tagline: string;
  thumbnail?: ImageMetadata;
  locationCount: number;
  locations: RegionCountryLocation[];
  pinIds: string[];
  rings: [number, number][][];
  itineraryCount: number;
  noteCount: number;
};

export type RegionPageData = {
  region: CollectionEntry<"regions">;
  name: string;
  tagline: string;
  accent: Accent;
  order: number;
  images: ImageMetadata[];
  countries: RegionCountry[];
  itineraries: RegionItinerary[];
  featuredStory?: RegionNote;
  notes: RegionNote[];
  locationPins: LocationMapPin[];
};

export async function loadRegionPage(
  slug: string,
): Promise<RegionPageData | undefined> {
  const region = await getRegion(slug);
  if (!region) return undefined;

  const [places, feed] = await Promise.all([getAllPlaces(), getEnFeed()]);
  const regionMap = regionByPlaceIdMap(places);
  const placeById = new Map(places.map((p) => [p.id, p] as const));
  const countryEntries = countriesForRegion(places, region.id);
  const countryIds = new Set(countryEntries.map((c) => c.id));
  const articles = articlesForRegion(feed, region.id, regionMap);
  const accent = region.data.accent;

  const itineraryEntries = articles.filter(
    (a): a is AnyEnArticle & { kind: "itinerary" } => a.kind === "itinerary",
  );
  const latestStory = articles
    .filter((a): a is AnyEnArticle & { kind: "story" } => a.kind === "story")
    .sort((a, b) => b.data.published.getTime() - a.data.published.getTime())[0];

  const noteEntries = articles.filter(
    (a) => a.kind !== "itinerary" && a.id !== latestStory?.id,
  );

  const itineraries: RegionItinerary[] = itineraryEntries.map((a) => ({
    id: a.id,
    href: articleHref(a),
    title: a.data.title,
    summary: a.data.summary,
    hero: a.data.hero,
    days: a.data.days.length,
    countries: a.data.country
      .map((ref) => placeById.get(ref.id))
      .filter((p): p is CollectionEntry<"places"> => Boolean(p))
      .map((p) => ({ id: p.id, name: p.data.name, flag: p.data.flag })),
  }));

  const [featuredStory, notes] = await Promise.all([
    latestStory ? regionNoteFromArticle(latestStory, accent) : undefined,
    Promise.all(noteEntries.map((a) => regionNoteFromArticle(a, accent))),
  ]);

  const locationPins = (await buildLocationMapPins(articles)).filter((pin) =>
    countryIds.has(pin.countryId),
  );

  const pinsByCountry = new Map<string, string[]>();
  for (const pin of locationPins) {
    const list = pinsByCountry.get(pin.countryId);
    if (list) list.push(pin.locationId);
    else pinsByCountry.set(pin.countryId, [pin.locationId]);
  }

  const noteCountByCountry = new Map<string, number>();
  const itineraryCountByCountry = new Map<string, number>();
  for (const article of articles) {
    const seen = new Set<string>();
    for (const ref of article.data.country) {
      if (seen.has(ref.id) || !countryIds.has(ref.id)) continue;
      seen.add(ref.id);
      if (article.kind === "itinerary") {
        itineraryCountByCountry.set(
          ref.id,
          (itineraryCountByCountry.get(ref.id) ?? 0) + 1,
        );
      } else {
        noteCountByCountry.set(
          ref.id,
          (noteCountByCountry.get(ref.id) ?? 0) + 1,
        );
      }
    }
  }

  const countries: RegionCountry[] = countryEntries.map((country) => ({
    id: country.id,
    country,
    href: `/explore/${country.id}`,
    name: country.data.name,
    shortName: placeShortName(country),
    flag: country.data.flag,
    tagline: country.data.tagline,
    thumbnail: placeThumbnailForCountry(country, feed),
    locationCount: country.data.locations.length,
    locations: country.data.locations.map((loc) => ({
      qualifiedId: qualifiedLocationId(country.id, loc.id),
      name: loc.name,
    })),
    pinIds: pinsByCountry.get(country.id) ?? [],
    rings: getCountryShape(country.id)?.rings ?? [],
    itineraryCount: itineraryCountByCountry.get(country.id) ?? 0,
    noteCount: noteCountByCountry.get(country.id) ?? 0,
  }));

  return {
    region,
    name: region.data.name,
    tagline: region.data.tagline,
    accent,
    order: region.data.order,
    images: region.data.images,
    countries,
    itineraries,
    featuredStory,
    notes,
    locationPins,
  };
}
