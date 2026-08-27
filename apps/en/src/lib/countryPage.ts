import type { ImageMetadata } from "astro";
import type { CollectionEntry } from "astro:content";
import type { Accent } from "@shared/lib/accent";
import { articleHref, articleKicker } from "~/lib/articles";
import { countryLine } from "~/lib/articlePlaces";
import { getCountryShape } from "~/lib/countryShape";
import {
  countryRefsFromArticle,
  getEnFeed,
  getPlace,
  primaryCountryFromArticle,
} from "~/lib/content";
import {
  buildLocationIndex,
  placeLocationLabel,
  qualifiedLocationId,
} from "~/lib/locations";
import { buildLocationMapPins } from "~/lib/mapPinData";
import {
  placeCoverFromFrontmatterPath,
  requirePlaceCoverFromFrontmatter,
} from "~/lib/placeCover";
import {
  getAllRegions,
  getRegion,
  regionIdFromPlace,
  regionMapById,
} from "~/lib/regions";

export const INTRO_SNAPSHOT_COUNT = 4;

/** Extra zoom levels applied after fitBounds on country hub maps. */
const COUNTRY_MAP_FIT_ZOOM_OFFSET: Partial<Record<string, number>> = {
  argentina: 1,
};

export function countryMapFitZoomOffset(countryId: string): number {
  return COUNTRY_MAP_FIT_ZOOM_OFFSET[countryId] ?? 0;
}

export type CountryLocation = {
  id: string;
  name: string;
  qualifiedId: string;
};

export type CountrySnapshot = {
  image: ImageMetadata;
  caption: string;
  location: string;
};

export function placeHasBody(country: CollectionEntry<"places">): boolean {
  return (country.body?.trim().length ?? 0) > 0;
}

export async function getPlaceSnapshots(
  country: CollectionEntry<"places">,
): Promise<CountrySnapshot[]> {
  const locationIndex = await buildLocationIndex();
  const snapshots: CountrySnapshot[] = [];

  for (const snap of country.data.snapshots ?? []) {
    const image = placeCoverFromFrontmatterPath(snap.image);
    if (!image) continue;

    const location =
      (await placeLocationLabel(country, snap.location, locationIndex)) ??
      country.data.name;

    snapshots.push({
      image,
      caption: snap.caption ?? location,
      location,
    });
  }

  return snapshots;
}

export function showCountryIntro(
  country: CollectionEntry<"places">,
  snapshots: CountrySnapshot[],
): boolean {
  return placeHasBody(country) && snapshots.length >= INTRO_SNAPSHOT_COUNT;
}

export function showCountryMap(
  country: CollectionEntry<"places">,
  locations: CountryLocation[],
): boolean {
  return country.data.showMap && locations.length >= 2;
}

export async function loadCountryPage(country: CollectionEntry<"places">) {
  const [feed, regions] = await Promise.all([getEnFeed(), getAllRegions()]);
  const regionsById = regionMapById(regions);

  const region = await getRegion(country.data.region);
  if (!region) throw new Error(`Missing region for ${country.id}`);

  const articles = feed.filter((article) =>
    countryRefsFromArticle(article).some((ref) => ref.id === country.id),
  );
  const locationPins = (await buildLocationMapPins(articles)).filter(
    (pin) => pin.countryId === country.id,
  );
  const accent: Accent = country.data.accent ?? region.data.accent;
  const cover = requirePlaceCoverFromFrontmatter(country);
  const snapshots = await getPlaceSnapshots(country);

  const entries = await Promise.all(
    articles.map(async (article) => {
      const countries = (
        await Promise.all(article.data.country.map((ref) => getPlace(ref)))
      ).filter((place): place is CollectionEntry<"places"> => Boolean(place));
      const primary = await getPlace(primaryCountryFromArticle(article));
      const regionId = primary ? regionIdFromPlace(primary) : undefined;
      const articleRegion = regionId ? regionsById.get(regionId) : undefined;

      return {
        article,
        href: articleHref(article),
        kicker: articleKicker(article),
        countryMeta: countryLine(countries),
        accent: primary?.data.accent ?? articleRegion?.data.accent,
        regionLabel: articleRegion?.data.name,
      };
    }),
  );

  const locations = (country.data.locations ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    qualifiedId: qualifiedLocationId(country.id, loc.id),
  }));

  return {
    country,
    region,
    entries,
    locationPins,
    locations,
    snapshots,
    accent,
    cover,
    shape: getCountryShape(country.id),
  };
}
