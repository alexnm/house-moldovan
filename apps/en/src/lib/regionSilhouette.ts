/**
 * Region silhouettes for the home region tiles: the whole continent (or, for
 * the Middle East, the region) as one faint shape, without Russia. Built from the Natural Earth
 * atlas at build time and drawn in `currentColor`, so the tile decides the ink.
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
  /** Every country in the region, as one path. */
  land: string;
};

const SIZE = 200;
const MIN_STEP = 1.5; // drop points closer than this (in viewBox units)
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

export function regionSilhouette(regionId: string): RegionSilhouette | undefined {
  if (cache.has(regionId)) return cache.get(regionId);

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
    cache.set(regionId, undefined);
    return undefined;
  }

  let s = 90, n = -90, w = 180, e = -180;
  for (const ring of rings) {
    for (const [lat, lng] of ring) {
      s = Math.min(s, lat); n = Math.max(n, lat);
      w = Math.min(w, lng); e = Math.max(e, lng);
    }
  }
  // Equirectangular, x squeezed by cos(mid-latitude) so shapes aren't stretched.
  const kx = Math.cos((((s + n) / 2) * Math.PI) / 180);
  const width = (e - w) * kx;
  const height = n - s;
  const scale = SIZE / Math.max(width, height);
  const x = (lng: number) => (lng - w) * kx * scale;
  const y = (lat: number) => (n - lat) * scale;

  const toPath = (ring: Ring): string => {
    const pts: [number, number][] = [];
    for (const [lat, lng] of ring) {
      const p: [number, number] = [x(lng), y(lat)];
      const last = pts[pts.length - 1];
      if (!last || Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) >= MIN_STEP) {
        pts.push(p);
      }
    }
    if (pts.length < 3) return "";
    return `M${pts.map(([px, py]) => `${Math.round(px)} ${Math.round(py)}`).join("L")}Z`;
  };

  const result: RegionSilhouette = {
    viewBox: `0 0 ${Math.round(width * scale)} ${Math.round(height * scale)}`,
    land: rings.map(toPath).join(""),
  };
  cache.set(regionId, result);
  return result;
}
