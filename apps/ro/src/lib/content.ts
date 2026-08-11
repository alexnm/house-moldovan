import { getCollection, getEntry, type CollectionEntry } from "astro:content";

const notDraft = (e: CollectionEntry<"hikes">): boolean => e.data.draft !== true;

const byHikePublishedDesc = (
  a: CollectionEntry<"hikes">,
  b: CollectionEntry<"hikes">,
): number => {
  const t = b.data.published.getTime() - a.data.published.getTime();
  if (t !== 0) return t;
  return a.id.localeCompare(b.id, "ro");
};

export const getHikes = async (): Promise<CollectionEntry<"hikes">[]> => {
  const all = await getCollection("hikes");
  return all.filter(notDraft).sort(byHikePublishedDesc);
};

export const getRange = async (
  ref: { collection: "ranges"; id: string } | string,
): Promise<CollectionEntry<"ranges"> | undefined> => {
  if (typeof ref === "string") {
    return await getEntry("ranges", ref);
  }
  return await getEntry(ref);
};

export const RANGE_ORDER = [
  "apuseni",
  "rodnei",
  "fagaras",
  "retezat",
  "parang",
  "piatra-craiului",
] as const;

const rangeOrderIndex = (id: string): number => {
  const i = RANGE_ORDER.indexOf(id as (typeof RANGE_ORDER)[number]);
  return i === -1 ? RANGE_ORDER.length : i;
};

export const compareRangesByOrder = (
  a: CollectionEntry<"ranges">,
  b: CollectionEntry<"ranges">,
): number => rangeOrderIndex(a.id) - rangeOrderIndex(b.id);

export const getAllRanges = async (): Promise<CollectionEntry<"ranges">[]> => {
  const all = await getCollection("ranges");
  return all.sort(compareRangesByOrder);
};

/** Masiv display name by range id (for hike cards, meta). */
export const rangeNameById = (
  ranges: CollectionEntry<"ranges">[],
): ReadonlyMap<string, string> =>
  new Map(ranges.map((r) => [r.id, r.data.name] as const));
