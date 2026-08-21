import { getImage } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import { accentInkVar, type Accent } from "@shared/lib/accent";
import { articleHref, articleKicker } from "~/lib/articles";
import {
  getAllPlaces,
  getEnFeed,
  primaryCountryFromArticle,
  type AnyEnArticle,
} from "~/lib/content";
import { pinColorForAccent } from "~/lib/mapStyles";
import { getAllRegions, regionIdFromPlace } from "~/lib/regions";

/** Hero crop for map popups, at 2× the rendered width. */
export const ARTICLE_PIN_THUMB_SIZE = { width: 464, height: 290 } as const;

export type ArticleMapPin = {
  /** Unique per pin (`kind:id:index`) so multi-stop articles can share a title. */
  id: string;
  articleId: string;
  kind: AnyEnArticle["kind"];
  title: string;
  href: string;
  /** Article kind, plus day count for itineraries. */
  meta: string;
  /** Pin place name (coordinate label, else primary country). */
  placeLabel: string;
  countryFlag: string;
  countryName: string;
  /** `var(--color-*-ink)` so popup accents stay theme-aware. */
  accentVar: string;
  /** Hex for the pin badge on map paper. */
  pinColor: string;
  /** Build-time optimized hero crop. */
  thumb: string;
  lat: number;
  lng: number;
};

/**
 * Flatten every article coordinate into a pin. Articles without coordinates
 * are skipped; drafts are already filtered by `getEnFeed`.
 */
export async function buildArticleMapPins(
  feed?: AnyEnArticle[],
): Promise<ArticleMapPin[]> {
  const [articles, places, regions] = await Promise.all([
    feed ?? getEnFeed(),
    getAllPlaces(),
    getAllRegions(),
  ]);

  const placeById = new Map(places.map((p) => [p.id, p] as const));
  const regionAccent = new Map(
    regions.map((r) => [r.id, r.data.accent] as const),
  );

  const pins: ArticleMapPin[] = [];

  for (const article of articles) {
    const coords = article.data.coordinates;
    if (!coords.length) continue;

    const primaryRef = primaryCountryFromArticle(article);
    const primaryPlace = placeById.get(primaryRef.id);
    const accent = accentForPlace(primaryPlace, regionAccent);
    const countryByLabel = countryByLocationLabel(article, placeById);

    const thumb = await getImage({
      src: article.data.hero,
      ...ARTICLE_PIN_THUMB_SIZE,
      format: "avif",
      quality: 70,
    });

    coords.forEach((coord, index) => {
      const place =
        (coord.label ? countryByLabel.get(coord.label) : undefined) ??
        primaryPlace;
      const countryName = place?.data.name ?? primaryRef.id;
      const countryFlag = place?.data.flag ?? "";

      pins.push({
        id: `${article.kind}:${article.id}:${index}`,
        articleId: article.id,
        kind: article.kind,
        title: article.data.title,
        href: articleHref(article),
        meta: articleKicker(article),
        placeLabel: coord.label ?? countryName,
        countryFlag,
        countryName,
        accentVar: accentInkVar(accent),
        pinColor: pinColorForAccent(accent),
        thumb: thumb.src,
        lat: coord.lat,
        lng: coord.lng,
      });
    });
  }

  return pins;
}

/** Map itinerary stop labels to their country entry when the day lists them. */
function countryByLocationLabel(
  article: AnyEnArticle,
  placeById: ReadonlyMap<string, CollectionEntry<"places">>,
): Map<string, CollectionEntry<"places">> {
  const out = new Map<string, CollectionEntry<"places">>();
  if (article.kind !== "itinerary") return out;

  for (const day of article.data.days) {
    for (const loc of day.locations) {
      if (out.has(loc.label)) continue;
      const place = placeById.get(loc.country.id);
      if (place) out.set(loc.label, place);
    }
  }
  return out;
}

function accentForPlace(
  place: CollectionEntry<"places"> | undefined,
  regionAccent: ReadonlyMap<string, Accent>,
): Accent {
  if (!place) return "terracotta";
  if (place.data.accent) return place.data.accent;
  return regionAccent.get(regionIdFromPlace(place)) ?? "terracotta";
}
