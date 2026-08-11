import { getCollection, getEntry, type CollectionEntry } from "astro:content";

export type RegionEntry = CollectionEntry<"regions">;
export type Region = RegionEntry["id"];

export const getAllRegions = async (): Promise<RegionEntry[]> => {
  const all = await getCollection("regions");
  return all.sort((a, b) => a.data.order - b.data.order);
};

export const getRegion = async (
  ref: { collection: "regions"; id: string } | Region,
): Promise<RegionEntry | undefined> => {
  if (typeof ref === "string") {
    return await getEntry("regions", ref);
  }
  return await getEntry(ref);
};

export const regionMapById = (
  regions: RegionEntry[],
): ReadonlyMap<Region, RegionEntry> =>
  new Map(regions.map((r) => [r.id, r] as const));

export const regionIdFromPlace = (place: CollectionEntry<"places">): Region =>
  place.data.region.id;
