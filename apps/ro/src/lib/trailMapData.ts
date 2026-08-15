import { getImage } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import { accentInkVar } from "@shared/lib/accent";
import { getGpxTrack } from "@shared/lib/gpx";
import { ro } from "~/i18n/ro";
import { accentForDifficulty, type HikeDifficulty } from "~/lib/difficulty";
import type { WaymarkCode } from "~/lib/waymarks";

/** Overview maps draw many tracks at once, so each needs far fewer vertices. */
const MAX_POINTS = 120;

/** Hero crop for map popups, at 2× the rendered width. */
export const TRAIL_THUMB_SIZE = { width: 464, height: 290 } as const;

/** Screen-reader names for the popup stats. */
export const TRAIL_MAP_LABELS = {
  distance: ro.hike.distance,
  gain: ro.hike.elevationGain,
  duration: ro.hike.duration,
  summit: ro.hike.summit,
} as const;

export type TrailFeature = {
  id: string;
  title: string;
  href: string;
  rangeId: string;
  rangeName: string;
  difficulty: HikeDifficulty;
  difficultyLabel: string;
  waymark: readonly WaymarkCode[];
  /** `var(--color-*-ink)` for the difficulty, so popups stay theme-aware. */
  accentVar: string;
  /** Pre-formatted, so the client script carries no i18n. */
  distance: string;
  gain: string;
  duration: string;
  shape: string;
  summit: string | null;
  /** Build-time optimized hero crop, fetched when a popup opens. */
  thumb: string;
  /** GeoJSON vertex order: [lng, lat]. */
  line: [number, number][];
};

const DIFFICULTY_ORDER = [
  "usor",
  "mediu",
  "dificil",
  "tehnic",
] as const satisfies readonly HikeDifficulty[];

export type TrailLegendEntry = { id: string; name: string; count: number };

/**
 * The map's colour key, counted over drawn trails rather than the hike list so
 * it never advertises a colour that no line on the map carries.
 */
export function difficultyLegend(trails: TrailFeature[]): TrailLegendEntry[] {
  return DIFFICULTY_ORDER.filter((d) =>
    trails.some((t) => t.difficulty === d),
  ).map((d) => ({
    id: d,
    name: ro.difficulty[d],
    count: trails.filter((t) => t.difficulty === d).length,
  }));
}

/** Hikes whose GPX holds no track (e.g. an empty `<trkseg/>`) are skipped. */
export async function buildTrailFeatures(
  hikes: CollectionEntry<"hikes">[],
  rangeNames: ReadonlyMap<string, string>,
): Promise<TrailFeature[]> {
  const features: TrailFeature[] = [];

  for (const hike of hikes) {
    let track;
    try {
      track = getGpxTrack(hike.data.gpx, "public", MAX_POINTS);
    } catch {
      track = null;
    }
    if (!track) continue;

    const thumb = await getImage({
      src: hike.data.hero,
      ...TRAIL_THUMB_SIZE,
      format: "avif",
      quality: 70,
    });

    const { data } = hike;
    const rangeId = data.range.id;

    features.push({
      id: hike.id,
      title: data.title,
      href: `/${hike.id}`,
      rangeId,
      rangeName: rangeNames.get(rangeId) ?? rangeId,
      difficulty: data.difficulty,
      difficultyLabel: ro.difficulty[data.difficulty],
      waymark: data.waymark,
      accentVar: accentInkVar(accentForDifficulty(data.difficulty)),
      distance: ro.units.distance(data.distance),
      gain: `+${ro.units.elevation(data.elevationGain)}`,
      duration: ro.units.duration(data.duration),
      shape: ro.shape[data.shape],
      summit: data.summit ? ro.units.elevation(data.summit) : null,
      thumb: thumb.src,
      line: track.line,
    });
  }

  return features;
}
