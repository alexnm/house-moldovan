import type { CollectionEntry } from "astro:content";
import type { Accent } from "~/lib/accent";
import type { RegionEntry } from "~/lib/regions";
import { regionIdFromPlace } from "~/lib/regions";

export interface PlaceLink {
  label: string;
  href: string;
}

export function placeShortName(place: CollectionEntry<"places">): string {
  return place.data.shortName ?? place.data.name;
}

export function countryLine(countries: CollectionEntry<"places">[]): string {
  return countries.map((p) => `${p.data.flag} ${p.data.name}`).join(" ");
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
