import type { CollectionEntry } from "astro:content";
import { getAllRanges, getHikes, rangeNameById } from "~/lib/content";
import { rangeCoverFromFrontmatterPath } from "~/lib/rangeCoverImport";

export type RoAtlasRangeTile = {
  range: CollectionEntry<"ranges">;
  cover: import("astro").ImageMetadata | undefined;
  /** Tall crop for the atlas wall; falls back to `cover`. */
  atlas: import("astro").ImageMetadata | undefined;
  count: number;
};

export async function loadRoAtlasHomeData() {
  const [hikes, ranges] = await Promise.all([getHikes(), getAllRanges()]);
  const rangeNames = rangeNameById(ranges);

  const countByRange = new Map<string, number>();
  for (const h of hikes) {
    countByRange.set(
      h.data.range.id,
      (countByRange.get(h.data.range.id) ?? 0) + 1,
    );
  }

  const rangeTiles: RoAtlasRangeTile[] = ranges
    .filter((r) => countByRange.has(r.id))
    .map((range) => {
      const cover = rangeCoverFromFrontmatterPath(range.data.cover);
      return {
        range,
        cover,
        atlas: rangeCoverFromFrontmatterPath(range.data.atlas) ?? cover,
        count: countByRange.get(range.id) ?? 0,
      };
    });

  return { hikes, rangeNames, rangeTiles, countByRange };
}
