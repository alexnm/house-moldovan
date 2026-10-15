import type { ImageMetadata } from "astro";
import type { CollectionEntry } from "astro:content";
import type { Accent } from "@shared/lib/accent";
import { articleHref, articleKicker } from "~/lib/articles";
import { countryLine, placeShortName } from "~/lib/articlePlaces";
import {
  articlesForRegion,
  countriesForRegion,
  getPublishedPlaces,
  getEnFeed,
  getPlace,
  primaryCountryFromArticle,
  regionByPlaceIdMap,
  type AnyEnArticle,
} from "~/lib/content";
import { getCountryShape } from "~/lib/countryShape";
import { atlasForView } from "~/lib/routeAtlas";
import { qualifiedLocationId } from "~/lib/locations";
import { buildLocationMapPins, type LocationMapPin } from "~/lib/mapPinData";
import type { RouteAtlas } from "~/lib/routeMap";
import {
  placeCoverForCountry,
  placeThumbnailForCountry,
} from "~/lib/placeCover";
import { getRegion } from "~/lib/regions";
import { renderMarkdownFragment } from "~/lib/markdownFragment";

const REGION_DOSSIER_COUNT = 3;

export type RegionDossierItem = {
  href: string;
  title: string;
  summary: string;
  hero: ImageMetadata;
  kicker: string;
  meta: string;
};

const byPublishedDesc = (a: AnyEnArticle, b: AnyEnArticle): number =>
  b.data.published.getTime() - a.data.published.getTime();

const articleKey = (a: AnyEnArticle): string => `${a.kind}:${a.id}`;

async function dossierFromArticle(
  a: AnyEnArticle,
  placeById: Map<string, CollectionEntry<"places">>,
  fallbackAccent: Accent,
): Promise<RegionDossierItem> {
  if (a.kind === "itinerary") {
    const countries = a.data.country
      .map((ref) => placeById.get(ref.id))
      .filter((p): p is CollectionEntry<"places"> => Boolean(p))
      .map((p) => ({ id: p.id, name: p.data.name, flag: p.data.flag }));
    return {
      href: articleHref(a),
      title: a.data.title,
      summary: a.data.summary,
      hero: a.data.hero,
      kicker: articleKicker(a),
      meta: countries.map((c) => `${c.flag} ${c.name}`).join(" · "),
    };
  }
  const note = await regionNoteFromArticle(a, fallbackAccent);
  return {
    href: note.href,
    title: a.data.title,
    summary: a.data.summary,
    hero: a.data.hero,
    kicker: note.kicker,
    meta: note.countryMeta,
  };
}

function pickDossierArticles(articles: AnyEnArticle[]): AnyEnArticle[] {
  const picked: AnyEnArticle[] = [];
  const seen = new Set<string>();

  const take = (pool: AnyEnArticle[]): void => {
    for (const a of pool) {
      if (picked.length >= REGION_DOSSIER_COUNT) return;
      const key = articleKey(a);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(a);
    }
  };

  take(articles.filter((a) => a.kind === "itinerary").sort(byPublishedDesc));
  take(articles.filter((a) => a.kind === "story").sort(byPublishedDesc));
  take(articles.filter((a) => a.kind === "spotlight").sort(byPublishedDesc));

  return picked;
}

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

export type RegionFeaturedStory = RegionNote & {
  title: string;
  summary: string;
  hero: ImageMetadata;
};

function pickFeaturedStory(
  articles: AnyEnArticle[],
  featuredId: string | undefined,
): AnyEnArticle | undefined {
  const stories = articles.filter((a) => a.kind === "story");
  const pinned = featuredId
    ? stories.find((a) => a.id === featuredId)
    : undefined;
  return pinned ?? [...stories].sort(byPublishedDesc)[0];
}

/** First and last paragraph of the region body, rendered to HTML, for the authors' note. */
async function editorialFromBody(body: string | undefined): Promise<string[]> {
  const blocks = (body ?? "")
    .trim()
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  const picked = blocks.length > 1 ? [blocks[0]!, blocks.at(-1)!] : blocks;
  return Promise.all(picked.map(renderMarkdownFragment));
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
  accent: Accent;
  cover?: ImageMetadata;
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
  countries: RegionCountry[];
  dossier: RegionDossierItem[];
  featuredStory?: RegionFeaturedStory;
  /** Rendered HTML paragraphs for the authors' editorial note. */
  editorial: string[];
  notes: RegionNote[];
  locationPins: LocationMapPin[];
  atlas?: RouteAtlas;
};

export async function loadRegionPage(
  slug: string,
): Promise<RegionPageData | undefined> {
  const region = await getRegion(slug);
  if (!region) return undefined;

  const [places, feed] = await Promise.all([getPublishedPlaces(), getEnFeed()]);
  const regionMap = regionByPlaceIdMap(places);
  const placeById = new Map(places.map((p) => [p.id, p] as const));
  const countryEntries = countriesForRegion(places, region.id);
  const countryIds = new Set(countryEntries.map((c) => c.id));
  const articles = articlesForRegion(feed, region.id, regionMap);
  const accent = region.data.accent;

  const featuredArticle = pickFeaturedStory(articles, region.data.featured?.id);
  const featuredKey = featuredArticle ? articleKey(featuredArticle) : undefined;

  const dossierPicks = pickDossierArticles(
    articles.filter((a) => articleKey(a) !== featuredKey),
  );
  const usedKeys = new Set(dossierPicks.map(articleKey));
  if (featuredKey) usedKeys.add(featuredKey);

  const noteEntries = articles
    .filter((a) => !usedKeys.has(articleKey(a)))
    .sort(byPublishedDesc);

  const [dossier, notes, featuredNote, editorial] = await Promise.all([
    Promise.all(
      dossierPicks.map((a) => dossierFromArticle(a, placeById, accent)),
    ),
    Promise.all(noteEntries.map((a) => regionNoteFromArticle(a, accent))),
    featuredArticle
      ? regionNoteFromArticle(featuredArticle, accent)
      : Promise.resolve(undefined),
    editorialFromBody(region.body),
  ]);

  const featuredStory: RegionFeaturedStory | undefined = featuredNote && {
    ...featuredNote,
    title: featuredNote.a.data.title,
    summary: featuredNote.a.data.summary,
    hero: featuredNote.a.data.hero,
  };

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
    accent: country.data.accent ?? accent,
    cover: placeCoverForCountry(country, feed),
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

  const countryViews = countries.map((country) => country.rings.flat());
  const atlasPoints = countryViews.flat();

  return {
    region,
    name: region.data.name,
    tagline: region.data.tagline,
    accent,
    countries,
    dossier,
    featuredStory,
    editorial,
    notes,
    locationPins,
    atlas: atlasPoints.length
      ? atlasForView(atlasPoints, countryViews)
      : undefined,
  };
}
