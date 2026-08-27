import { getImage } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import { accentInkVar, type Accent } from "@shared/lib/accent";
import { articleHref, articleKicker } from "~/lib/articles";
import { articleLocationIds } from "~/lib/articleLocations";
import { placeCountryLine } from "~/lib/articlePlaces";
import {
  getAllPlaces,
  getEnFeed,
  primaryCountryFromArticle,
  type AnyEnArticle,
} from "~/lib/content";
import { buildLocationIndex, type ResolvedLocation } from "~/lib/locations";
import { placeCoverFromFrontmatterPath } from "~/lib/placeCover";
import { getAllRegions, regionIdFromPlace } from "~/lib/regions";

/** Hero crop for map popups, at 2× the rendered width. */
export const ARTICLE_PIN_THUMB_SIZE = { width: 464, height: 290 } as const;

export type ArticleMapPin = {
  /** Unique per pin (`kind:id:index`) so multi-stop articles can share a title. */
  id: string;
  articleId: string;
  /** Resolved country for country-scoped maps. */
  countryId: string;
  /** Qualified location id, e.g. `jordan/petra`. */
  locationId: string;
  kind: AnyEnArticle["kind"];
  title: string;
  href: string;
  /** Article kind, plus day count for itineraries. */
  meta: string;
  /** "Petra, Jordan" — no flag, no repeated country. */
  location: string;
  /** Chapter accent, so the pin palette can follow the basemap. */
  accent: Accent;
  /** `var(--color-*-ink)` so popup accents stay theme-aware. */
  accentVar: string;
  /** Build-time optimized hero crop. */
  thumb: string;
  lat: number;
  lng: number;
};

/**
 * Flatten every article location into a pin. Articles without locations
 * are skipped; drafts are already filtered by `getEnFeed`.
 */
export async function buildArticleMapPins(
  feed?: AnyEnArticle[],
): Promise<ArticleMapPin[]> {
  const [articles, places, regions, locationIndex] = await Promise.all([
    feed ?? getEnFeed(),
    getAllPlaces(),
    getAllRegions(),
    buildLocationIndex(),
  ]);

  const placeById = new Map(places.map((p) => [p.id, p] as const));
  const regionAccent = new Map(
    regions.map((r) => [r.id, r.data.accent] as const),
  );

  const pins: ArticleMapPin[] = [];

  for (const article of articles) {
    const locationIds = articleLocationIds(article);
    if (!locationIds.length) continue;

    const primaryRef = primaryCountryFromArticle(article);
    const primaryPlace = placeById.get(primaryRef.id);
    const accent = accentForPlace(primaryPlace, regionAccent);

    const thumb = await getImage({
      src: article.data.hero,
      ...ARTICLE_PIN_THUMB_SIZE,
      format: "avif",
      quality: 70,
    });

    locationIds.forEach((locationId, index) => {
      const resolved = locationIndex.get(locationId);
      if (!resolved) {
        throw new Error(
          `Unknown location "${locationId}" on ${article.kind} ${article.id}`,
        );
      }

      const place = resolved.country;
      const countryName = place.data.name;

      pins.push({
        id: `${article.kind}:${article.id}:${index}`,
        articleId: article.id,
        countryId: place.id,
        locationId,
        kind: article.kind,
        title: article.data.title,
        href: articleHref(article),
        meta: articleKicker(article),
        location: placeCountryLine(resolved.name, countryName),
        accent: accentForPlace(place, regionAccent) ?? accent,
        accentVar: accentInkVar(accentForPlace(place, regionAccent) ?? accent),
        thumb: thumb.src,
        lat: resolved.lat,
        lng: resolved.lng,
      });
    });
  }

  return pins;
}

function accentForPlace(
  place: CollectionEntry<"places"> | undefined,
  regionAccent: ReadonlyMap<string, Accent>,
): Accent {
  if (!place) return "terracotta";
  if (place.data.accent) return place.data.accent;
  return regionAccent.get(regionIdFromPlace(place)) ?? "terracotta";
}

export function locationLabel(resolved: ResolvedLocation): string {
  return placeCountryLine(resolved.name, resolved.country.data.name);
}

export type LocationMapActivity = {
  articleId: string;
  kind: AnyEnArticle["kind"];
  title: string;
  href: string;
  meta: string;
  thumb: string;
};

/** One pin per catalogued country location, with linked articles in the popup. */
export type LocationMapPin = {
  id: string;
  locationId: string;
  countryId: string;
  name: string;
  /** "Petra, Jordan" */
  label: string;
  accent: Accent;
  accentVar: string;
  lat: number;
  lng: number;
  /** Optimized location photo for map popups. */
  thumb?: string;
  activities: LocationMapActivity[];
};

/**
 * Plot every location from every country. Articles referencing a location
 * become popup activities; locations without coverage still get a pin.
 */
export async function buildLocationMapPins(
  feed?: AnyEnArticle[],
): Promise<LocationMapPin[]> {
  const [articles, regions, locationIndex] = await Promise.all([
    feed ?? getEnFeed(),
    getAllRegions(),
    buildLocationIndex(),
  ]);

  const regionAccent = new Map(
    regions.map((r) => [r.id, r.data.accent] as const),
  );

  const activitiesByLocation = new Map<string, AnyEnArticle[]>();
  for (const article of articles) {
    for (const locationId of articleLocationIds(article)) {
      const list = activitiesByLocation.get(locationId);
      if (list) list.push(article);
      else activitiesByLocation.set(locationId, [article]);
    }
  }

  const thumbByArticle = new Map<string, string>();
  const thumbByLocation = new Map<string, string>();

  async function thumbFor(article: AnyEnArticle): Promise<string> {
    const cached = thumbByArticle.get(article.id);
    if (cached) return cached;
    const image = await getImage({
      src: article.data.hero,
      ...ARTICLE_PIN_THUMB_SIZE,
      format: "avif",
      quality: 70,
    });
    thumbByArticle.set(article.id, image.src);
    return image.src;
  }

  async function locationThumb(resolved: ResolvedLocation): Promise<string | undefined> {
    const cached = thumbByLocation.get(resolved.qualifiedId);
    if (cached) return cached;

    const src = placeCoverFromFrontmatterPath(resolved.image);
    if (!src) return undefined;

    const image = await getImage({
      src,
      ...ARTICLE_PIN_THUMB_SIZE,
      format: "avif",
      quality: 70,
    });
    thumbByLocation.set(resolved.qualifiedId, image.src);
    return image.src;
  }

  const pins: LocationMapPin[] = [];

  for (const resolved of locationIndex.values()) {
    const linked = activitiesByLocation.get(resolved.qualifiedId) ?? [];
    const accent = accentForPlace(resolved.country, regionAccent);

    const activities: LocationMapActivity[] = await Promise.all(
      linked.map(async (article) => ({
        articleId: article.id,
        kind: article.kind,
        title: article.data.title,
        href: articleHref(article),
        meta: articleKicker(article),
        thumb: await thumbFor(article),
      })),
    );

    pins.push({
      id: resolved.qualifiedId,
      locationId: resolved.qualifiedId,
      countryId: resolved.countryId,
      name: resolved.name,
      label: locationLabel(resolved),
      accent,
      accentVar: accentInkVar(accent),
      lat: resolved.lat,
      lng: resolved.lng,
      thumb: await locationThumb(resolved),
      activities,
    });
  }

  return pins;
}
