import type { Region } from "~/lib/regions";
import { regionIdFromPlace } from "~/lib/regions";
import type { AnyEnArticle } from "~/lib/content";
import { getAllPlaces, getEnFeed } from "~/lib/content";

function stableIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % modulo;
}

function pickFromPool(pickSeed: string, pool: AnyEnArticle[]): AnyEnArticle {
  const sorted = [...pool].sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  );
  const i = stableIndex(pickSeed, sorted.length);
  return sorted[i]!;
}

function countryIdSet(a: AnyEnArticle): Set<string> {
  return new Set(a.data.country.map((c) => c.id));
}

function sharesPlace(a: AnyEnArticle, b: AnyEnArticle): boolean {
  const A = countryIdSet(a);
  for (const id of countryIdSet(b)) {
    if (A.has(id)) return true;
  }
  return false;
}

function placeRegions(
  a: AnyEnArticle,
  regionByPlaceId: Map<string, Region>,
): Set<Region> {
  const s = new Set<Region>();
  for (const ref of a.data.country) {
    const r = regionByPlaceId.get(ref.id);
    if (r) s.add(r);
  }
  return s;
}

function sharesRegion(
  a: AnyEnArticle,
  b: AnyEnArticle,
  regionByPlaceId: Map<string, Region>,
): boolean {
  const A = placeRegions(a, regionByPlaceId);
  for (const r of placeRegions(b, regionByPlaceId)) {
    if (A.has(r)) return true;
  }
  return false;
}

const articleKey = (a: AnyEnArticle): string => `${a.kind}:${a.id}`;

/**
 * Picks one related article, anchored to `current`, from an already-excluded
 * candidate list (e.g. excluding the current page and any picks already used).
 */
function pickReadNextFromPool(
  current: AnyEnArticle,
  other: AnyEnArticle[],
  regionByPlaceId: Map<string, Region>,
  pickSeed: string,
): AnyEnArticle | null {
  if (other.length === 0) return null;

  const sameCountry = other.filter((a) => sharesPlace(current, a));
  if (sameCountry.length > 0) {
    if (current.kind === "story") {
      const sameCountryAndType = sameCountry.filter(
        (a) => a.kind === "story" && a.data.type === current.data.type,
      );
      if (sameCountryAndType.length > 0) {
        return pickFromPool(pickSeed, sameCountryAndType);
      }
    }
    if (current.kind === "spotlight") {
      const sameCountrySpotlights = sameCountry.filter(
        (a) => a.kind === "spotlight",
      );
      if (sameCountrySpotlights.length > 0) {
        return pickFromPool(pickSeed, sameCountrySpotlights);
      }
    }
    return pickFromPool(pickSeed, sameCountry);
  }

  if (current.kind === "story") {
    const sameType = other.filter(
      (a) => a.kind === "story" && a.data.type === current.data.type,
    );
    if (sameType.length > 0) {
      return pickFromPool(pickSeed, sameType);
    }
  }

  if (current.kind === "spotlight") {
    const otherSpotlights = other.filter((a) => a.kind === "spotlight");
    if (otherSpotlights.length > 0) {
      return pickFromPool(pickSeed, otherSpotlights);
    }
  }

  const sameRegion = other.filter((a) =>
    sharesRegion(current, a, regionByPlaceId),
  );
  if (sameRegion.length > 0) {
    return pickFromPool(pickSeed, sameRegion);
  }

  return pickFromPool(pickSeed, other);
}

/**
 * Suggests another journal article: same place first (with same story destination
 * type as a tiebreak when applicable), else same kind preference, else same
 * region, else any other article. Deterministic for a given current article.
 */
export async function getReadNextArticle(
  current: AnyEnArticle,
): Promise<AnyEnArticle | null> {
  const list = await getReadNextArticles(current, 1);
  return list[0] ?? null;
}

const MAX_READ_NEXT = 3;

/**
 * Up to `limit` (max 3) follow-up stories for the end of the article, using the
 * same priority as a single read-next; later picks stay anchored to
 * `current` and exclude earlier picks. Fewer are returned if the feed is small.
 */
export async function getReadNextArticles(
  current: AnyEnArticle,
  limit: number = MAX_READ_NEXT,
): Promise<AnyEnArticle[]> {
  const cap = Math.min(Math.max(1, limit), MAX_READ_NEXT);
  const [feed, places] = await Promise.all([getEnFeed(), getAllPlaces()]);
  const regionByPlaceId = new Map(
    places.map((p) => [p.id, regionIdFromPlace(p)] as const),
  );

  const out: AnyEnArticle[] = [];
  const used = new Set<string>([articleKey(current)]);

  for (let slot = 0; slot < cap; slot += 1) {
    const other = feed.filter((a) => !used.has(articleKey(a)));
    if (other.length === 0) break;

    const pickSeed =
      slot === 0
        ? `${current.kind}:${current.id}`
        : `${current.kind}:${current.id}:slot${slot + 1}`;

    const next = pickReadNextFromPool(
      current,
      other,
      regionByPlaceId,
      pickSeed,
    );
    if (!next) break;
    out.push(next);
    used.add(articleKey(next));
  }

  return out;
}
