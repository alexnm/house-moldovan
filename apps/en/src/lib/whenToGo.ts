/**
 * "Where to go now": which countries are in season in a given month, from
 * each place's `bestTime` windows. One page per month at /explore/when/{month}.
 */
import type { CollectionEntry } from "astro:content";
import type { ImageMetadata } from "astro";
import { getEnFeed, getPublishedPlaces } from "~/lib/content";
import { placeCoverLocationLabel } from "~/lib/locations";
import {
  placeCoverForCountry,
  placeThumbnailForCountry,
} from "~/lib/placeCover";
import { placeShortName } from "~/lib/articlePlaces";
import {
  getAllRegions,
  regionIdFromPlace,
  type RegionEntry,
} from "~/lib/regions";
import {
  regionSilhouette,
  type RegionSilhouette,
} from "~/lib/regionSilhouette";
import type { Accent } from "@shared/lib/accent";
import { formatBestTimeInMonth, labelsInMonth } from "~/lib/bestTime";

type Place = CollectionEntry<"places">;

export const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;
export type MonthSlug = (typeof MONTHS)[number];

const capitalize = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** 1–12 → "October". */
export const monthName = (month: number): string =>
  capitalize(MONTHS[month - 1]!);
/** 1–12 → "Oct". */
export const monthShort = (month: number): string =>
  monthName(month).slice(0, 3);
/** 1–12 → "/explore/when/october". */
export const monthHref = (month: number): string =>
  `/explore/when/${MONTHS[month - 1]}`;
/** "october" → 10, or undefined. */
export const monthFromSlug = (slug: string): number | undefined => {
  const i = MONTHS.indexOf(slug as MonthSlug);
  return i === -1 ? undefined : i + 1;
};
const nextMonth = (month: number) => (month % 12) + 1;

/**
 * Hero photo per month: the cover of a country we'd send you to then.
 * Must be in season that month; otherwise the page falls back to the first
 * in-season country with a cover.
 */
const MONTH_HERO: Record<number, string> = {
  1: "thailand",
  2: "singapore",
  3: "jordan",
  4: "japan",
  5: "netherlands",
  6: "slovenia",
  7: "peru",
  8: "austria",
  9: "italy",
  10: "hong-kong",
  11: "cambodia",
  12: "argentina",
};

export const inSeason = (place: Place, month: number): boolean =>
  place.data.bestTime.some((w) => w.months.includes(month));

export interface SeasonCountry {
  id: string;
  href: string;
  name: string;
  flag: string;
  /** The best-time windows that cover the month in question, as text. */
  bestTime?: string;
  /** Labels of those windows only, e.g. "Autumn leaves". */
  seasonLabel?: string;
  tagline: string;
  image?: ImageMetadata;
  regionId: string;
  regionName: string;
  accent: Accent;
}

export interface SeasonRegion {
  id: string;
  name: string;
  href: string;
  accent: Accent;
  shape?: RegionSilhouette;
  inSeason: SeasonCountry[];
  total: number;
  /** Every country in the region as a dot, in viewBox percentages. */
  dots: { name: string; x: number; y: number; on: boolean }[];
}

export interface MonthPage {
  month: number;
  name: string;
  hero?: { image: ImageMetadata; alt: string; location?: string };
  totalCountries: number;
  /** In season this month, A–Z. */
  countries: SeasonCountry[];
  /** How many countries are in season each month, January first. */
  counts: number[];
  regions: SeasonRegion[];
  /** In season next month but not this one, A–Z. */
  comingUp: SeasonCountry[];
  next: { month: number; name: string; href: string };
  /** The places, for the authors' note stamps. */
  places: Place[];
}

/** Rough centre of a country, from the places we list in it. */
function countryPoint(place: Place): [number, number] | undefined {
  const locs = place.data.locations;
  if (locs.length === 0) return undefined;
  const lat = locs.reduce((sum, l) => sum + l.lat, 0) / locs.length;
  const lng = locs.reduce((sum, l) => sum + l.lng, 0) / locs.length;
  return [lat, lng];
}

export async function loadMonthPage(month: number): Promise<MonthPage> {
  const [places, regions, feed] = await Promise.all([
    getPublishedPlaces(),
    getAllRegions(),
    getEnFeed(),
  ]);
  const regionById = new Map<string, RegionEntry>(
    regions.map((r) => [r.id, r]),
  );
  const byName = (a: Place, b: Place) => a.data.name.localeCompare(b.data.name);

  const toCountry = (place: Place, forMonth = month): SeasonCountry => {
    const region = regionById.get(regionIdFromPlace(place));
    return {
      id: place.id,
      href: `/explore/${place.id}`,
      name: placeShortName(place),
      flag: place.data.flag,
      bestTime: formatBestTimeInMonth(place.data.bestTime, forMonth),
      seasonLabel: labelsInMonth(place.data.bestTime, forMonth),
      tagline: place.data.tagline,
      image: placeThumbnailForCountry(place, feed),
      regionId: region?.id ?? "",
      regionName: region?.data.name ?? "",
      accent: region?.data.accent ?? "saffron",
    };
  };

  const now = places.filter((p) => inSeason(p, month)).sort(byName);
  const after = nextMonth(month);
  const comingUp = places
    .filter((p) => inSeason(p, after) && !inSeason(p, month))
    .sort(byName);

  const seasonRegions: SeasonRegion[] = regions
    .map((region) => {
      const members = places
        .filter((p) => regionIdFromPlace(p) === region.id)
        .sort(byName);
      const shape = regionSilhouette(region.id);
      const dots = shape
        ? members.flatMap((p) => {
            const pt = countryPoint(p);
            if (!pt) return [];
            const [x, y] = shape.project(pt[0], pt[1]);
            return [
              {
                name: placeShortName(p),
                x: (x / shape.width) * 100,
                y: (y / shape.height) * 100,
                on: inSeason(p, month),
              },
            ];
          })
        : [];
      return {
        id: region.id,
        name: region.data.name,
        href: `/explore/region/${region.id}`,
        accent: region.data.accent,
        shape,
        inSeason: members
          .filter((p) => inSeason(p, month))
          .map((p) => toCountry(p)),
        total: members.length,
        dots,
      };
    })
    .filter((r) => r.total > 0);

  const heroPlace =
    now.find((p) => p.id === MONTH_HERO[month]) ??
    now.find((p) => placeCoverForCountry(p, feed));
  const heroImage = heroPlace && placeCoverForCountry(heroPlace, feed);
  let hero: MonthPage["hero"];
  if (heroPlace && heroImage) {
    const label = await placeCoverLocationLabel(heroPlace);
    const country = placeShortName(heroPlace);
    const location = label
      ? label.includes(country)
        ? label
        : `${label}, ${country}`
      : country;
    hero = { image: heroImage, alt: location, location };
  }

  return {
    month,
    name: monthName(month),
    hero,
    totalCountries: places.length,
    countries: now.map((p) => toCountry(p)),
    counts: Array.from(
      { length: 12 },
      (_, i) => places.filter((p) => inSeason(p, i + 1)).length,
    ),
    regions: seasonRegions,
    comingUp: comingUp.map((p) => toCountry(p, after)),
    next: { month: after, name: monthName(after), href: monthHref(after) },
    places: now,
  };
}
