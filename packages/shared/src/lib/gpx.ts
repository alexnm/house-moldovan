import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { gpx as gpxToGeoJSON } from "@tmcw/togeojson";

type LngLat = [number, number];

const EARTH_RADIUS_KM = 6371;
const toRad = (d: number): number => (d * Math.PI) / 180;

const haversine = (a: LngLat, b: LngLat): number => {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(x));
};

const totalDistanceKm = (path: LngLat[]): number => {
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (a && b) sum += haversine(a, b);
  }
  return sum;
};

/** Sample along the track: distance (km), elevation (m), and position. */
export type ElevationPoint = {
  d: number;
  h: number;
  /** GeoJSON order. Used to place a map pin while scrubbing the profile. */
  lng: number;
  lat: number;
};

export interface ParsedTrack {
  distanceKm: number;
  ascentM: number;
  descentM: number;
  minElevation: number;
  maxElevation: number;
  profile: ElevationPoint[];
}

export interface GpxBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface GpxTrackForMap {
  /** GeoJSON order: [lng, lat] for each vertex (simplified for web payload). */
  line: LngLat[];
  bounds: GpxBounds;
}

const ASCENT_THRESHOLD = 3;

const smooth = (values: number[], window = 5): number[] => {
  if (values.length === 0) return values;
  const out: number[] = [];
  const half = Math.floor(window / 2);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -half; j <= half; j++) {
      const k = i + j;
      if (k >= 0 && k < values.length) {
        const v = values[k];
        if (v !== undefined) {
          sum += v;
          count++;
        }
      }
    }
    out.push(sum / count);
  }
  return out;
};

function extractCoordsFromDom(dom: Document): {
  coords: LngLat[];
  elevations: number[];
} {
  const fc = gpxToGeoJSON(dom as unknown as Document);
  const coords: LngLat[] = [];
  const elevations: number[] = [];

  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (geom.type === "LineString") {
      for (const c of geom.coordinates) {
        coords.push([c[0]!, c[1]!]);
        elevations.push(c[2] ?? 0);
      }
    } else if (geom.type === "MultiLineString") {
      for (const line of geom.coordinates) {
        for (const c of line) {
          coords.push([c[0]!, c[1]!]);
          elevations.push(c[2] ?? 0);
        }
      }
    }
  }
  return { coords, elevations };
}

function loadGpxDom(gpxRelPath: string, root: string): Document {
  const fullPath = join(process.cwd(), root, gpxRelPath);
  const xml = readFileSync(fullPath, "utf8");
  return new DOMParser().parseFromString(
    xml,
    "text/xml",
  ) as unknown as Document;
}

/** Raw track from GPX (no stats). Empty if file has no line geometry. */
const loadGpxCoords = (
  gpxRelPath: string,
  root = "public",
): { coords: LngLat[]; elevations: number[] } => {
  const dom = loadGpxDom(gpxRelPath, root);
  return extractCoordsFromDom(dom);
};

const simplifyLine = (coords: LngLat[], maxPoints: number): LngLat[] => {
  if (coords.length <= maxPoints) return coords;
  const out: LngLat[] = [];
  const n = coords.length;
  const step = (n - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(n - 1, Math.round(i * step));
    const p = coords[idx];
    if (p) out.push(p);
  }
  return out;
};

const boundsFromLine = (coords: LngLat[]): GpxBounds => {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, maxLng, minLat, maxLat };
};

const DEFAULT_MAP_MAX_POINTS = 400;

/**
 * Simplified polyline + bounds for a small interactive map.
 * Returns null when the GPX has no drawable track (caller should omit the map).
 */
export const getGpxTrack = (
  gpxRelPath: string,
  root = "public",
  maxPoints = DEFAULT_MAP_MAX_POINTS,
): GpxTrackForMap | null => {
  const { coords } = loadGpxCoords(gpxRelPath, root);
  if (coords.length === 0) return null;
  const line = simplifyLine(coords, maxPoints);
  return { line, bounds: boundsFromLine(line) };
};

/** True when the GPX has enough data for the elevation chart + hover script. */
export const hasGpxElevationProfile = (track: ParsedTrack): boolean =>
  track.profile.length >= 2 && track.distanceKm > 0;

export const parseGpx = (gpxRelPath: string, root = "public"): ParsedTrack => {
  const { coords, elevations } = loadGpxCoords(gpxRelPath, root);

  if (coords.length === 0) {
    return {
      distanceKm: 0,
      ascentM: 0,
      descentM: 0,
      minElevation: 0,
      maxElevation: 0,
      profile: [],
    };
  }

  const distanceKm = totalDistanceKm(coords);
  const smoothed = smooth(elevations, 7);

  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const a = smoothed[i - 1];
    const b = smoothed[i];
    if (a === undefined || b === undefined) continue;
    const delta = b - a;
    if (delta > ASCENT_THRESHOLD) ascent += delta;
    else if (delta < -ASCENT_THRESHOLD) descent -= delta;
  }

  let cumulative = 0;
  const profile: ElevationPoint[] = [];
  const step = Math.max(1, Math.floor(coords.length / 200));
  const pointAt = (i: number, d: number): ElevationPoint => {
    const c = coords[i]!;
    return {
      d,
      h: smoothed[i] ?? 0,
      lng: Number(c[0].toFixed(5)),
      lat: Number(c[1].toFixed(5)),
    };
  };
  for (let i = 0; i < coords.length; i += step) {
    if (i > 0) {
      const segPath: LngLat[] = [];
      for (let j = i - step; j <= i && j < coords.length; j++) {
        const p = coords[j];
        if (p) segPath.push(p);
      }
      cumulative += totalDistanceKm(segPath);
    }
    profile.push(pointAt(i, cumulative));
  }
  if (profile.length > 0) {
    const last = profile[profile.length - 1]!;
    if (last.d < distanceKm)
      profile.push(pointAt(coords.length - 1, distanceKm));
  }

  return {
    distanceKm,
    ascentM: Math.round(ascent),
    descentM: Math.round(descent),
    minElevation: Math.min(...smoothed),
    maxElevation: Math.max(...smoothed),
    profile,
  };
};

/** Layout for hike elevation SVG + client hover script (keep in sync with ElevationProfile script). */
export const ELEVATION_PROFILE_LAYOUT = {
  width: 800,
  height: 220,
  marginLeft: 68,
  marginRight: 28,
  marginTop: 12,
  marginBottom: 34,
} as const;

const fmtAxisElev = (m: number): string =>
  `${Math.round(m).toLocaleString("ro-RO")} m`;

const fmtAxisDist = (km: number): string =>
  km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} km`;

const elevationYTicks = (yMin: number, yMax: number): number[] => {
  const span = yMax - yMin;
  if (span < 1e-6) return [yMin];
  const rough = span / 4;
  const p10 = 10 ** Math.floor(Math.log10(rough));
  const err = rough / p10;
  const niceUnit =
    err <= 1 ? p10 : err <= 2 ? 2 * p10 : err <= 5 ? 5 * p10 : 10 * p10;
  let v = Math.ceil(yMin / niceUnit) * niceUnit;
  const ticks: number[] = [];
  while (v <= yMax + niceUnit * 0.01 && ticks.length < 10) {
    ticks.push(v);
    v += niceUnit;
  }
  if (ticks.length < 2) {
    return [yMin, yMax];
  }
  return ticks;
};

const distanceXTicks = (distanceKm: number): number[] => {
  const n =
    distanceKm <= 1.2 ? 2 : distanceKm <= 6 ? 3 : distanceKm <= 20 ? 4 : 5;
  return Array.from({ length: n + 1 }, (_, i) => (distanceKm * i) / n);
};

const escapeXmlAttr = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export type RenderProfileSvgOptions = {
  layout?: typeof ELEVATION_PROFILE_LAYOUT;
  /** Accessible name for the interactive chart (localized by the caller). */
  ariaLabel?: string;
  /** Optional id of an element that describes keyboard use. */
  describedById?: string;
};

export const renderProfileSvg = (
  profile: ElevationPoint[],
  totalDistanceKm?: number,
  options: RenderProfileSvgOptions = {},
): string => {
  if (profile.length < 2) return "";
  const layout = options.layout ?? ELEVATION_PROFILE_LAYOUT;
  const ariaLabel = escapeXmlAttr(options.ariaLabel ?? "Elevation profile");
  const describedBy = options.describedById
    ? ` aria-describedby="${escapeXmlAttr(options.describedById)}"`
    : "";
  const { width, height, marginLeft, marginRight, marginTop, marginBottom } =
    layout;
  const xs = profile.map((p) => p.d);
  const ys = profile.map((p) => p.h);
  const xMin = Math.min(...xs);
  const xMax = totalDistanceKm ?? Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xR = xMax - xMin || 1;
  const yR = yMax - yMin || 1;

  const innerL = marginLeft;
  const innerR = width - marginRight;
  const innerT = marginTop;
  const innerB = height - marginBottom;
  const innerW = innerR - innerL;
  const innerH = innerB - innerT;

  const sx = (x: number): number => innerL + ((x - xMin) / xR) * innerW;
  const sy = (y: number): number => innerB - ((y - yMin) / yR) * innerH;

  const linePoints = profile.map(
    (p) => `${sx(p.d).toFixed(1)},${sy(p.h).toFixed(1)}`,
  );
  const areaPath = `M ${linePoints[0]} L ${linePoints.slice(1).join(" L ")} L ${sx(xMax).toFixed(1)},${innerB.toFixed(1)} L ${sx(xMin).toFixed(1)},${innerB.toFixed(1)} Z`;
  const linePath = `M ${linePoints.join(" L ")}`;

  const yTicks = elevationYTicks(yMin, yMax);
  const gridLines = yTicks
    .map((yt) => {
      const y = sy(yt);
      return `<line x1="${innerL.toFixed(1)}" y1="${y.toFixed(1)}" x2="${innerR.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--color-line)" stroke-opacity="0.45" stroke-width="1" pointer-events="none" />`;
    })
    .join("");

  const yLabels = yTicks
    .map((yt) => {
      const y = sy(yt);
      return `<text x="${(innerL - 10).toFixed(1)}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" fill="var(--color-ink-faint)" font-size="11" font-family="var(--font-mono)" pointer-events="none">${fmtAxisElev(yt)}</text>`;
    })
    .join("");

  const xTicks = distanceXTicks(xMax);
  const xLabels = xTicks
    .map((xt) => {
      const x = sx(xt);
      return `<text x="${x.toFixed(1)}" y="${(height - 10).toFixed(1)}" text-anchor="middle" fill="var(--color-ink-faint)" font-size="11" font-family="var(--font-mono)" pointer-events="none">${fmtAxisDist(xt)}</text>`;
    })
    .join("");

  const hitRect = `<rect class="elev-hit" x="${innerL.toFixed(1)}" y="${innerT.toFixed(1)}" width="${innerW.toFixed(1)}" height="${innerH.toFixed(1)}" fill="transparent" cursor="crosshair" tabindex="0" role="slider" aria-orientation="horizontal" aria-label="${ariaLabel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext=""${describedBy} focusable="true" />`;

  const hoverGroup = `<g class="elev-hover-group" opacity="0" pointer-events="none">
<line class="elev-vline" x1="0" y1="${innerT.toFixed(1)}" x2="0" y2="${innerB.toFixed(1)}" stroke="var(--color-accent-ink)" stroke-width="1.25" stroke-dasharray="4 3" />
<circle class="elev-dot" r="4" fill="var(--color-surface-2)" stroke="var(--color-accent-ink)" stroke-width="1.75" />
<text class="elev-readout" fill="var(--color-ink)" font-size="12" font-weight="600" font-family="var(--font-mono)" dominant-baseline="hanging"></text>
<text class="elev-readout-dist" fill="var(--color-ink-dim)" font-size="10" font-family="var(--font-mono)" dominant-baseline="hanging"></text>
</g>`;

  return [
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">`,
    gridLines,
    yLabels,
    xLabels,
    `<path class="elev-area" d="${areaPath}" fill="var(--color-accent-ink)" fill-opacity="0.18" pointer-events="none" />`,
    `<path class="elev-line" d="${linePath}" fill="none" stroke="var(--color-accent-ink)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" pointer-events="none" />`,
    hoverGroup,
    hitRect,
    `</svg>`,
  ].join("");
};
