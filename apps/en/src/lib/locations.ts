import type { CollectionEntry } from "astro:content";
import { getAllPlaces } from "~/lib/content";

/** Coordinates for a named place within a country. */
export type LocationCoords = {
  lat: number;
  lng: number;
};

/** A location as stored on a country (place) entry. */
export type CountryLocationData = {
  id: string;
  name: string;
  image?: string;
} & LocationCoords;

/** Resolved location with its parent country. */
export type ResolvedLocation = CountryLocationData & {
  /** Globally unique id: `{countryId}/{localId}`. */
  qualifiedId: string;
  countryId: string;
  country: CollectionEntry<"places">;
};

export const qualifiedLocationId = (
  countryId: string,
  localId: string,
): string => `${countryId}/${localId}`;

export const parseQualifiedLocationId = (
  id: string,
): { countryId: string; localId: string } => {
  const slash = id.indexOf("/");
  if (slash <= 0 || slash === id.length - 1) {
    throw new Error(`Invalid location id "${id}" (expected country/local)`);
  }
  return { countryId: id.slice(0, slash), localId: id.slice(slash + 1) };
};

export async function buildLocationIndex(): Promise<
  Map<string, ResolvedLocation>
> {
  const places = await getAllPlaces();
  const index = new Map<string, ResolvedLocation>();

  for (const country of places) {
    for (const loc of country.data.locations) {
      const qualifiedId = qualifiedLocationId(country.id, loc.id);
      if (index.has(qualifiedId)) {
        throw new Error(`Duplicate location id "${qualifiedId}"`);
      }
      index.set(qualifiedId, {
        ...loc,
        qualifiedId,
        countryId: country.id,
        country,
      });
    }
  }

  return index;
}

export async function resolveLocation(
  id: string,
  index?: Map<string, ResolvedLocation>,
): Promise<ResolvedLocation | undefined> {
  const map = index ?? (await buildLocationIndex());
  return map.get(id);
}

export async function resolveLocations(
  ids: readonly string[],
  index?: Map<string, ResolvedLocation>,
): Promise<ResolvedLocation[]> {
  const map = index ?? (await buildLocationIndex());
  const out: ResolvedLocation[] = [];
  for (const id of ids) {
    const loc = map.get(id);
    if (loc) out.push(loc);
  }
  return out;
}

/** Display label for a place photo location reference. */
export async function placeLocationLabel(
  country: CollectionEntry<"places">,
  raw: string | undefined,
  index?: Map<string, ResolvedLocation>,
): Promise<string | undefined> {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  const map = index ?? (await buildLocationIndex());
  const resolved =
    map.get(trimmed) ??
    (trimmed.includes("/") ? undefined : map.get(qualifiedLocationId(country.id, trimmed)));
  if (resolved) return resolved.name;

  return trimmed;
}

/** Display label for a country cover photo location. */
export async function placeCoverLocationLabel(
  country: CollectionEntry<"places">,
  index?: Map<string, ResolvedLocation>,
): Promise<string | undefined> {
  return placeLocationLabel(country, country.data.coverLocation, index);
}
