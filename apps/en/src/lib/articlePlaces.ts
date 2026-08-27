import type { CollectionEntry } from "astro:content";
import type { Accent } from "@shared/lib/accent";
import type { RegionEntry } from "~/lib/regions";
import { regionIdFromPlace } from "~/lib/regions";
import { articleLocationIds } from "~/lib/articleLocations";
import {
  getPlace,
  primaryCountryFromArticle,
  type AnyEnArticle,
} from "~/lib/content";
import { buildLocationIndex } from "~/lib/locations";

export interface PlaceLink {
  label: string;
  href: string;
}

export function placeShortName(place: CollectionEntry<"places">): string {
  return place.data.shortName ?? place.data.name;
}

export function countryLine(countries: CollectionEntry<"places">[]): string {
  return countries.map((p) => `${p.data.flag} ${p.data.name}`).join(" · ");
}

/** Friendly location stamp: "Petra, Jordan". Drops a repeated country name. */
export function placeCountryLine(place?: string, country?: string): string {
  const namedPlace = place?.trim();
  const namedCountry = country?.trim();
  if (namedPlace && namedCountry && namedPlace !== namedCountry) {
    return `${namedPlace}, ${namedCountry}`;
  }
  return namedPlace || namedCountry || "";
}

/**
 * Where the hero photo was taken. Uses `heroLocation` when set, otherwise the
 * article's first map pin.
 */
export async function articleHeroLocation(
  article: AnyEnArticle,
): Promise<string> {
  const index = await buildLocationIndex();
  const heroId = article.data.heroLocation?.trim();
  if (heroId) {
    const resolved = index.get(heroId);
    if (resolved) {
      return placeCountryLine(resolved.name, resolved.country.data.name);
    }
    return heroId;
  }

  const [firstId] = articleLocationIds(article);
  if (!firstId) {
    const ref = primaryCountryFromArticle(article);
    const place = await getPlace(ref);
    return place?.data.name ?? ref.id;
  }

  const resolved = index.get(firstId);
  if (!resolved) return firstId;
  return placeCountryLine(resolved.name, resolved.country.data.name);
}

export function countryLinks(
  countries: CollectionEntry<"places">[],
): PlaceLink[] {
  return countries.map((p) => ({
    label: `${p.data.flag} ${placeShortName(p)}`,
    href: `/explore/${p.id}`,
  }));
}

export function uniqueRegionLine(
  countries: CollectionEntry<"places">[],
  regionsById: ReadonlyMap<string, RegionEntry>,
): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of countries) {
    const id = regionIdFromPlace(p);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(regionsById.get(id)?.data.name ?? id);
    }
  }
  return out.join(" · ");
}

export function uniqueRegionLinks(
  countries: CollectionEntry<"places">[],
  regionsById: ReadonlyMap<string, RegionEntry>,
): PlaceLink[] {
  const seen = new Set<string>();
  const out: PlaceLink[] = [];
  for (const p of countries) {
    const id = regionIdFromPlace(p);
    if (!seen.has(id)) {
      seen.add(id);
      out.push({
        label: regionsById.get(id)?.data.name ?? id,
        href: `/explore/region/${id}`,
      });
    }
  }
  return out;
}

export function regionAccentForPlaces(
  countries: CollectionEntry<"places">[],
  regionsById: ReadonlyMap<string, RegionEntry>,
): Accent {
  const first = countries[0]!;
  const region = regionsById.get(regionIdFromPlace(first));
  return first.data.accent ?? region?.data.accent ?? "jade";
}
