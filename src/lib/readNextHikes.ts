import type { CollectionEntry } from "astro:content";
import { getHikes } from "~/lib/content";

function stableIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++)
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % modulo;
}

function pickFromPool(
  pickSeed: string,
  pool: CollectionEntry<"hikes">[],
): CollectionEntry<"hikes"> {
  const sorted = [...pool].sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  );
  const i = stableIndex(pickSeed, sorted.length);
  return sorted[i]!;
}

function pickReadNextFromPool(
  current: CollectionEntry<"hikes">,
  other: CollectionEntry<"hikes">[],
  pickSeed: string,
): CollectionEntry<"hikes"> | null {
  if (other.length === 0) return null;

  const sameRange = other.filter(
    (a) => a.data.range.id === current.data.range.id,
  );
  if (sameRange.length > 0) {
    const sameRangeAndDifficulty = sameRange.filter(
      (a) => a.data.difficulty === current.data.difficulty,
    );
    if (sameRangeAndDifficulty.length > 0) {
      return pickFromPool(pickSeed, sameRangeAndDifficulty);
    }
    return pickFromPool(pickSeed, sameRange);
  }

  return pickFromPool(pickSeed, other);
}

const MAX_READ_NEXT = 3;

/**
 * Up to `limit` (max 3) follow-up hikes for the end of the article: same masiv
 * first (same difficulty as a tiebreak when applicable), else any other hike.
 * Deterministic for a given current hike.
 */
export async function getReadNextHikes(
  current: CollectionEntry<"hikes">,
  limit: number = MAX_READ_NEXT,
): Promise<CollectionEntry<"hikes">[]> {
  const cap = Math.min(Math.max(1, limit), MAX_READ_NEXT);
  const feed = await getHikes();

  const out: CollectionEntry<"hikes">[] = [];
  const used = new Set<string>([current.id]);

  for (let slot = 0; slot < cap; slot += 1) {
    const other = feed.filter((a) => !used.has(a.id));
    if (other.length === 0) break;

    const pickSeed =
      slot === 0
        ? current.id
        : `${current.id}:slot${slot + 1}`;

    const next = pickReadNextFromPool(current, other, pickSeed);
    if (!next) break;
    out.push(next);
    used.add(next.id);
  }

  return out;
}
