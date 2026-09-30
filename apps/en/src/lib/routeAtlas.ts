import world from "~/data/world-atlas.json";
import type { RouteAtlas } from "~/lib/routeMap";

type Ring = [number, number][];
type Rect = { s: number; w: number; n: number; e: number };

const WORLD = world as {
  countries: { name: string; rank: number; label: [number, number]; rings: Ring[] }[];
  lakes: Ring[];
};

function ringBox(ring: Ring): Rect {
  let s = 90;
  let n = -90;
  let w = 180;
  let e = -180;
  for (const [lat, lng] of ring) {
    if (lat < s) s = lat;
    if (lat > n) n = lat;
    if (lng < w) w = lng;
    if (lng > e) e = lng;
  }
  return { s, w, n, e };
}

const intersects = (a: Rect, b: Rect) =>
  a.w <= b.e && a.e >= b.w && a.s <= b.n && a.n >= b.s;

/** Sutherland–Hodgman against the frame. Edges it adds sit off-screen. */
function clipRing(ring: Ring, r: Rect): Ring {
  const edges: [(p: [number, number]) => boolean, (a: [number, number], b: [number, number]) => [number, number]][] = [
    [
      (p) => p[1] >= r.w,
      (a, b) => [a[0] + ((b[0] - a[0]) * (r.w - a[1])) / (b[1] - a[1]), r.w],
    ],
    [
      (p) => p[1] <= r.e,
      (a, b) => [a[0] + ((b[0] - a[0]) * (r.e - a[1])) / (b[1] - a[1]), r.e],
    ],
    [
      (p) => p[0] >= r.s,
      (a, b) => [r.s, a[1] + ((b[1] - a[1]) * (r.s - a[0])) / (b[0] - a[0])],
    ],
    [
      (p) => p[0] <= r.n,
      (a, b) => [r.n, a[1] + ((b[1] - a[1]) * (r.n - a[0])) / (b[0] - a[0])],
    ],
  ];
  let out = ring;
  for (const [inside, cross] of edges) {
    if (!out.length) break;
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      const curIn = inside(cur);
      const prevIn = inside(prev);
      if (curIn) {
        if (!prevIn) out.push(cross(prev, cur));
        out.push(cur);
      } else if (prevIn) {
        out.push(cross(prev, cur));
      }
    }
  }
  return out;
}

function sqSegDist(p: Ring[number], a: Ring[number], b: Ring[number]): number {
  let [x, y] = a;
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) [x, y] = b;
    else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/**
 * Douglas–Peucker to the route's scale, rounded to suit it. Each point is
 * measured against its own tolerance, so detail zones keep their vertices.
 */
function simplify(
  ring: Ring,
  toleranceAt: (p: Ring[number]) => number,
  digitsFor: (tolerance: number) => number,
): Ring {
  if (ring.length <= 4) return ring;
  const tolerances = ring.map(toleranceAt);
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxRatio = 1;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const t = tolerances[i]!;
      const ratio = sqSegDist(ring[i]!, ring[first]!, ring[last]!) / (t * t);
      if (ratio > maxRatio) {
        maxRatio = ratio;
        index = i;
      }
    }
    if (index >= 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) {
    if (!keep[i]) continue;
    const f = 10 ** digitsFor(tolerances[i]!);
    const p: Ring[number] = [
      Math.round(ring[i]![0] * f) / f,
      Math.round(ring[i]![1] * f) / f,
    ];
    const prev = out.at(-1);
    if (prev && prev[0] === p[0] && prev[1] === p[1]) continue;
    out.push(p);
  }
  return out;
}

type AtlasFrameOptions = {
  /** Extra degrees around the bounds. Defaults to half the span. */
  marginDeg?: number;
  /** Douglas–Peucker tolerance in degrees. Defaults to the span over 1100. */
  tolerance?: number;
  /** Areas drawn finer than `tolerance`, where the map zooms in. */
  detail?: readonly DetailZone[];
};

type DetailZone = { rect: Rect; tolerance: number };

const contains = (r: Rect, [lat, lng]: Ring[number]) =>
  lat >= r.s && lat <= r.n && lng >= r.w && lng <= r.e;

/**
 * Countries and lakes around the route, clipped to a frame well past the
 * visible map so clip edges never show, and thinned to the route's scale.
 */
export function routeAtlas(
  bounds: [[number, number], [number, number]],
  options?: AtlasFrameOptions,
): RouteAtlas {
  const [[south, west], [north, east]] = bounds;
  const spanLat = north - south;
  const spanLng = east - west;
  const span = Math.max(spanLat, spanLng);
  const margin = options?.marginDeg ?? span * 0.5 + 0.5;
  const frame: Rect = {
    s: Math.max(-89, south - margin),
    n: Math.min(89, north + margin),
    w: Math.max(-180, west - margin),
    e: Math.min(180, east + margin),
  };
  // About half a pixel at the width the route plate is drawn.
  const tolerance = options?.tolerance ?? span / 1100;
  const hub = options?.tolerance != null;
  const digits = span > 12 ? 2 : 3;
  // Hub maps zoom in, so round to the tolerance rather than the frame.
  const digitsFor = (t: number): number =>
    hub ? (t >= 0.01 ? 2 : 3) : digits;
  // A custom tolerance is for zoomable hub maps. Keep the drop threshold
  // small so city-states in a wide region are not simplified away.
  const minAreaFor = (t: number): number =>
    hub ? Math.min(t * t * 16, 0.03) : t * t * 16;
  const zones = (options?.detail ?? []).filter(
    (zone) => zone.tolerance < tolerance,
  );

  const clipAll = (rings: Ring[]): Ring[] => {
    const out: Ring[] = [];
    for (const ring of rings) {
      const box = ringBox(ring);
      if (!intersects(box, frame)) continue;
      const near = zones.filter((zone) => intersects(box, zone.rect));
      const ringTolerance = Math.min(
        tolerance,
        ...near.map((zone) => zone.tolerance),
      );
      if ((box.n - box.s) * (box.e - box.w) < minAreaFor(ringTolerance)) {
        continue;
      }
      const toleranceAt = (p: Ring[number]): number => {
        let t = tolerance;
        for (const zone of near) {
          if (zone.tolerance < t && contains(zone.rect, p)) t = zone.tolerance;
        }
        return t;
      };
      const clipped = simplify(clipRing(ring, frame), toleranceAt, digitsFor);
      if (clipped.length >= 3) out.push(clipped);
    }
    return out;
  };

  const countries: RouteAtlas["countries"] = [];
  for (const c of WORLD.countries) {
    const rings = clipAll(c.rings);
    if (!rings.length) continue;
    countries.push({ name: c.name, rank: c.rank, label: c.label, rings });
  }

  return { countries, lakes: clipAll(WORLD.lakes) };
}

/**
 * Atlas for a country or region map.
 *
 * The hub fits these points with `pad(0.12)` into a card that is sometimes a
 * tall phone and sometimes a short wide window. Size the clip to that view,
 * then a little past it, so the cut stays off the map when the page loads.
 * Coastlines use the same tolerance as an itinerary of this span.
 */
const VIEW_PAD = 1.24;
const VIEW_MIN_ASPECT = 0.55;
const VIEW_MAX_ASPECT = 2;
const VIEW_BLEED = 1.18;

function viewFrame(points: readonly [number, number][]): DetailZone {
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  for (const [lat, lng] of points) {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }
  const midLat = (south + north) / 2;
  const midLng = (west + east) / 2;
  const cos = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
  const latSpan = Math.max(north - south, 0.5);
  const lngSpan = Math.max(east - west, 0.5);
  const projH = latSpan * VIEW_PAD;
  const projW = lngSpan * cos * VIEW_PAD;
  const visW = Math.max(projW, projH * VIEW_MAX_ASPECT) * VIEW_BLEED;
  const visH = Math.max(projH, projW / VIEW_MIN_ASPECT) * VIEW_BLEED;
  return {
    rect: {
      s: midLat - visH / 2,
      n: midLat + visH / 2,
      w: midLng - visW / cos / 2,
      e: midLng + visW / cos / 2,
    },
    tolerance: Math.max(latSpan, lngSpan) / 1100,
  };
}

/**
 * `detail` holds the points of each view the map zooms to, such as the
 * countries of a region. Each view's area is drawn as finely as that view
 * on its own, so a country matches its own page.
 */
export function atlasForView(
  points: readonly [number, number][],
  detail: readonly (readonly [number, number][])[] = [],
): RouteAtlas {
  const { rect, tolerance } = viewFrame(points);
  return routeAtlas(
    [
      [rect.s, rect.w],
      [rect.n, rect.e],
    ],
    {
      marginDeg: 0,
      tolerance,
      detail: detail.filter((view) => view.length).map(viewFrame),
    },
  );
}
