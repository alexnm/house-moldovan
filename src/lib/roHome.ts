import type { CollectionEntry } from "astro:content";
import { getAllRanges, getHikes, rangeNameByTrailId } from "~/lib/content";
import { trailCoverFromFrontmatterPath } from "~/lib/trailCoverImport";

export type RoAtlasRangeTile = {
  range: CollectionEntry<"trails">;
  cover: import("astro").ImageMetadata | undefined;
  /** Tall crop for the atlas wall; falls back to `cover`. */
  atlas: import("astro").ImageMetadata | undefined;
  count: number;
};

export async function loadRoAtlasHomeData() {
  const [hikes, ranges] = await Promise.all([getHikes(), getAllRanges()]);
  const rangeNames = rangeNameByTrailId(ranges);

  const countByRange = new Map<string, number>();
  for (const h of hikes) {
    countByRange.set(
      h.data.range.id,
      (countByRange.get(h.data.range.id) ?? 0) + 1,
    );
  }

  const rangeTiles: RoAtlasRangeTile[] = ranges
    .filter((r) => countByRange.has(r.id))
    .sort(
      (a, b) => (countByRange.get(b.id) ?? 0) - (countByRange.get(a.id) ?? 0),
    )
    .map((range) => {
      const cover = trailCoverFromFrontmatterPath(range.data.cover);
      return {
        range,
        cover,
        atlas: trailCoverFromFrontmatterPath(range.data.atlas) ?? cover,
        count: countByRange.get(range.id) ?? 0,
      };
    });

  return { hikes, rangeNames, rangeTiles, countByRange };
}
