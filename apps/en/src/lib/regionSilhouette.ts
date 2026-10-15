/**
 * Region silhouettes for the home region tiles: the whole continent (or, for
 * the Middle East, the region) as one faint shape, without Russia. Built from the Natural Earth
 * atlas at build time (Mercator projection) and drawn in `currentColor`, so the tile decides the ink.
 */
import world from "~/data/world-atlas.json";

type Ring = [number, number][];
/** south, west, north, east */
type Frame = [number, number, number, number];

const WORLD = world as {
  countries: { name: string; rings: Ring[] }[];
};

/** Countries (atlas names) that make up each region's outline. */
const REGION_MEMBERS: Record<string, string[]> = {
  asia: [
    "Afghanistan", "Bangladesh", "Bhutan", "Brunei", "Cambodia",
    "East Timor", "Hong Kong", "India", "Indonesia", "Japan", "Kazakhstan",
    "Kyrgyzstan", "Laos", "Macau", "Malaysia", "Mongolia", "Myanmar", "Nepal",
    "North Korea", "Pakistan", "People's Republic of China", "Philippines",
    "Singapore", "South Korea", "Sri Lanka", "Taiwan", "Tajikistan", "Thailand",
    "Turkmenistan", "Uzbekistan", "Vietnam", "Siachen Glacier", "Baikonur",
  ],
  europe: [
    "Albania", "Andorra", "Austria", "Belarus", "Belgium",
    "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
    "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
    "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein",
    "Lithuania", "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro",
    "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", "Romania",
    "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden",
    "Switzerland", "Ukraine", "United Kingdom", "Isle of Man", "Faroe Islands",
  ],
  "middle-east": [
    "Bahrain", "Egypt", "Iran", "Iraq", "Israel", "Jordan", "Kuwait", "Lebanon",
    "Oman", "Palestine", "Qatar", "Saudi Arabia", "Syria", "Turkey",
    "United Arab Emirates", "Yemen",
  ],
  "south-america": [
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana",
    "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela", "Falkland Islands",
    "Southern Patagonian Ice Field",
  ],
};

/**
 * Frame per region. Shapes are clipped to it so far-flung territories fall
 * away. Russia is left out of both Europe and Asia to keep the shapes compact.
 */
const REGION_FRAME: Record<string, Frame> = {
  asia: [-11, 46, 56, 150],
  europe: [34, -25, 71.5, 42],
  "middle-east": [12, 24, 43, 64],
  "south-america": [-56, -82, 13, -34],
};

export type RegionSilhouette = {
  viewBox: string;
  /** viewBox width and height. */
  width: number;
  height: number;
  /** Every country in the region, as one path. */
  land: string;
  /** The same outlines as point lists in viewBox units (for hit-testing). */
  rings: [number, number][][];
  /** Projects a latitude/longitude into viewBox units. */
  project: (lat: number, lng: number) => [number, number];
};

const MIN_AREA = 0.25; // drop islands smaller than this (square degrees)

function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i]![1] * ring[i + 1]![0] - ring[i + 1]![1] * ring[i]![0];
  }
  return Math.abs(a) / 2;
}

/** Sutherland–Hodgman clip of a [lat, lng] ring against the frame. */
function clipRing(ring: Ring, [s, w, n, e]: Frame): Ring {
  type Edge = [
    (p: [number, number]) => boolean,
    (a: [number, number], b: [number, number]) => [number, number],
  ];
  const atLng = (a: [number, number], b: [number, number], lng: number): [number, number] =>
    [a[0] + ((b[0] - a[0]) * (lng - a[1])) / (b[1] - a[1]), lng];
  const atLat = (a: [number, number], b: [number, number], lat: number): [number, number] =>
    [lat, a[1] + ((b[1] - a[1]) * (lat - a[0])) / (b[0] - a[0])];
  const edges: Edge[] = [
    [(p) => p[1] >= w, (a, b) => atLng(a, b, w)],
    [(p) => p[1] <= e, (a, b) => atLng(a, b, e)],
    [(p) => p[0] >= s, (a, b) => atLat(a, b, s)],
    [(p) => p[0] <= n, (a, b) => atLat(a, b, n)],
  ];
  let out: Ring = ring;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cross(prev, cur));
      }
    }
    if (out.length === 0) break;
  }
  return out;
}

const cache = new Map<string, RegionSilhouette | undefined>();

/** Small silhouette for cards and tiles (200 units on the long side). */
export function regionSilhouette(regionId: string): RegionSilhouette | undefined {
  return buildSilhouette(regionId, 200, 1.5);
}

/** Detailed silhouette for the region hero map (1000 units on the long side). */
export function regionMapSilhouette(regionId: string): RegionSilhouette | undefined {
  return buildSilhouette(regionId, 1000, 2.5);
}

/**
 * @param size length of the long side, in viewBox units
 * @param minStep drop points closer than this (in viewBox units)
 */
function buildSilhouette(
  regionId: string,
  size: number,
  minStep: number,
): RegionSilhouette | undefined {
  const key = `${regionId}:${size}`;
  if (cache.has(key)) return cache.get(key);

  const members = REGION_MEMBERS[regionId];
  const frame = REGION_FRAME[regionId];
  if (!members || !frame) return undefined;
  const byName = new Map(WORLD.countries.map((c) => [c.name, c] as const));

  const rings: Ring[] = [];
  for (const name of members) {
    const country = byName.get(name);
    if (!country) continue;
    for (const ring of country.rings) {
      // Skip rings that cross the antimeridian; they're Pacific slivers here.
      let minLng = 180, maxLng = -180;
      for (const [, lng] of ring) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
      if (maxLng - minLng > 300) continue;
      const clipped = clipRing(ring, frame);
      if (clipped.length < 3 || ringArea([...clipped, clipped[0]!]) < MIN_AREA) continue;
      rings.push(clipped);
    }
  }
  if (rings.length === 0) {
    cache.set(key, undefined);
    return undefined;
  }

  let s = 90, n = -90, w = 180, e = -180;
  for (const ring of rings) {
    for (const [lat, lng] of ring) {
      s = Math.min(s, lat); n = Math.max(n, lat);
      w = Math.min(w, lng); e = Math.max(e, lng);
    }
  }
  // Mercator, like web maps: local shapes stay true (Spain looks like Spain),
  // high latitudes are enlarged. y is in "degree" units so it matches x.
  const mercY = (lat: number) =>
    (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
  const width = e - w;
  const height = mercY(n) - mercY(s);
  const scale = size / Math.max(width, height);
  const x = (lng: number) => (lng - w) * scale;
  const y = (lat: number) => (mercY(n) - mercY(lat)) * scale;

  const simplified: [number, number][][] = [];
  for (const ring of rings) {
    const pts: [number, number][] = [];
    for (const [lat, lng] of ring) {
      const p: [number, number] = [x(lng), y(lat)];
      const last = pts[pts.length - 1];
      if (!last || Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) >= minStep) {
        pts.push(p);
      }
    }
    if (pts.length >= 3) simplified.push(pts);
  }
  const toPath = (pts: [number, number][]): string =>
    `M${pts.map(([px, py]) => `${Math.round(px)} ${Math.round(py)}`).join("L")}Z`;

  const vw = Math.round(width * scale);
  const vh = Math.round(height * scale);
  const result: RegionSilhouette = {
    viewBox: `0 0 ${vw} ${vh}`,
    width: vw,
    height: vh,
    land: simplified.map(toPath).join(""),
    rings: simplified,
    project: (lat, lng) => [x(lng), y(lat)],
  };
  cache.set(key, result);
  return result;
}
