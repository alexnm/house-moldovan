/** Geographic route drawn on the locations map. Framing matches the old schematic. */

export type RouteMapSegment = {
  /** `[lat, lng]`, sampled along an arch when this hop is a transfer. */
  latlngs: [number, number][];
  transfer: boolean;
};

export type RouteMapTransport = {
  latlngs: [number, number][];
  mode: "car" | "bus" | "train" | "ferry" | "plane";
};

export type RouteMapStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Part numbers anchored here. Empty means a plain stop. */
  parts: number[];
};

/** Vector world around the route, for the atlas style. Rings are `[lat, lng]`. */
export type RouteAtlas = {
  countries: {
    name: string;
    /** Natural Earth label rank: lower is more prominent. */
    rank: number;
    label: [number, number];
    rings: [number, number][][];
  }[];
  lakes: [number, number][][];
};

export type RouteMap = {
  width: number;
  height: number;
  /** Inset, in the same units as `width`, so the path frames the view. */
  pad: number;
  /** Expanded bounds the map fits: `[[south, west], [north, east]]`. */
  bounds: [[number, number], [number, number]];
  segments: RouteMapSegment[];
  transport: RouteMapTransport[];
  stops: RouteMapStop[];
  /** Present when either theme draws the atlas instead of tiles. */
  atlas?: RouteAtlas;
};

const FRAME_W = 560;
const FRAME_MAX_H = 880;
const FRAME_PAD = 56;
const MIN_SPAN = 0.3;

export const ROUTE_PIN_R = 11;
export const ROUTE_DOT_R = 5;
export const ROUTE_ICON = 22;

type LatLng = { lat: number; lng: number };

/** Cosine of the route's mid-latitude, so east-west distances match north-south. */
export function routeCosLat(points: readonly [number, number][]): number {
  if (!points.length) return 1;
  let min = 90;
  let max = -90;
  for (const [lat] of points) {
    min = Math.min(min, lat);
    max = Math.max(max, lat);
  }
  return Math.cos((((min + max) / 2) * Math.PI) / 180) || 0.2;
}

/**
 * Quadratic bow off the chord, in the same projected plane the schematic used,
 * sampled back to lat/lng so it sits on the real map.
 */
export function archLatLngs(
  a: LatLng,
  b: LatLng,
  cosLat: number,
): [number, number][] {
  const ax = a.lng * cosLat;
  const ay = -a.lat;
  const bx = b.lng * cosLat;
  const by = -b.lat;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const bend = 0.22;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  const steps = 16;
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * ax + 2 * u * t * cx + t * t * bx;
    const y = u * u * ay + 2 * u * t * cy + t * t * by;
    out.push([-y, x / cosLat]);
  }
  return out;
}

type Spans = {
  spanX: number;
  spanY: number;
  south: number;
  north: number;
  west: number;
  east: number;
};

function spans(points: readonly [number, number][]): Spans {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  const cosLat = routeCosLat(points);
  const rawX = (maxLng - minLng) * cosLat;
  const rawY = maxLat - minLat;
  const spanX = Math.max(rawX, MIN_SPAN);
  const spanY = Math.max(rawY, MIN_SPAN);
  return {
    spanX,
    spanY,
    south: minLat - (spanY - rawY) / 2,
    north: maxLat + (spanY - rawY) / 2,
    west: minLng - (spanX / cosLat - (maxLng - minLng)) / 2,
    east: maxLng + (spanX / cosLat - (maxLng - minLng)) / 2,
  };
}

/** View size and geographic bounds so the path fills the map the way the schematic did. */
export function routeFrame(points: readonly [number, number][]): {
  width: number;
  height: number;
  pad: number;
  bounds: [[number, number], [number, number]];
} {
  const box = points.length
    ? spans(points)
    : { spanX: MIN_SPAN, spanY: MIN_SPAN, south: 0, north: MIN_SPAN, west: 0, east: MIN_SPAN };
  const s = Math.min(
    (FRAME_W - 2 * FRAME_PAD) / box.spanX,
    (FRAME_MAX_H - 2 * FRAME_PAD) / box.spanY,
  );
  const height = Math.max(320, Math.round(box.spanY * s + 2 * FRAME_PAD));
  return {
    width: FRAME_W,
    height,
    pad: FRAME_PAD,
    bounds: [
      [box.south, box.west],
      [box.north, box.east],
    ],
  };
}

export type RouteLabel = {
  stopIndex: number;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  text: string;
  strong: boolean;
};

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) =>
  a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

/**
 * Greedy label placement in container pixels. Pins first, then plain stops.
 * Plain stops that still collide stay unlabelled.
 */
export function placeRouteLabels(
  stops: readonly { x: number; y: number; name: string; parts: number[] }[],
  lines: readonly (readonly { x: number; y: number }[])[],
  icons: readonly { x: number; y: number; size: number }[],
  extras: readonly Box[],
  width: number,
  height: number,
): RouteLabel[] {
  const occupied: Box[] = [...extras];
  for (const st of stops) {
    if (st.parts.length === 0) {
      occupied.push({
        x1: st.x - ROUTE_DOT_R,
        y1: st.y - ROUTE_DOT_R,
        x2: st.x + ROUTE_DOT_R,
        y2: st.y + ROUTE_DOT_R,
      });
      continue;
    }
    const n = st.parts.length;
    const half = (n * (ROUTE_PIN_R * 2 + 2)) / 2;
    occupied.push({
      x1: st.x - half,
      y1: st.y - ROUTE_PIN_R,
      x2: st.x + half,
      y2: st.y + ROUTE_PIN_R,
    });
  }
  for (const icon of icons) {
    occupied.push({
      x1: icon.x,
      y1: icon.y,
      x2: icon.x + icon.size,
      y2: icon.y + icon.size,
    });
  }

  const lineBoxes: Box[] = [];
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1]!;
      const b = line[i]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 14));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        lineBoxes.push({ x1: x - 2, y1: y - 2, x2: x + 2, y2: y + 2 });
      }
    }
  }

  const labels: RouteLabel[] = [];
  const ordered = stops
    .map((st, stopIndex) => ({ st, stopIndex }))
    .sort((a, b) => b.st.parts.length - a.st.parts.length);

  for (const { st, stopIndex } of ordered) {
    const strong = st.parts.length > 0;
    const r = strong ? (st.parts.length * (ROUTE_PIN_R * 2 + 2)) / 2 : ROUTE_DOT_R;
    const w = st.name.length * (strong ? 7.8 : 6.9);
    const h = strong ? 14 : 13;
    const mk = (
      x: number,
      y: number,
      anchor: RouteLabel["anchor"],
    ): RouteLabel => ({
      stopIndex,
      x: Math.round(x),
      y: Math.round(y),
      anchor,
      text: st.name,
      strong,
    });
    const cands: RouteLabel[] = [
      mk(st.x + r + 7, st.y + 5, "start"),
      mk(st.x - r - 7, st.y + 5, "end"),
      mk(st.x, st.y - r - 8, "middle"),
      mk(st.x, st.y + r + 17, "middle"),
      mk(st.x + r + 4, st.y - r - 4, "start"),
      mk(st.x - r - 4, st.y - r - 4, "end"),
      mk(st.x + r + 4, st.y + r + 14, "start"),
      mk(st.x - r - 4, st.y + r + 14, "end"),
    ];
    const boxOf = (c: RouteLabel): Box => {
      const x1 =
        c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - w : c.x - w / 2;
      return { x1, y1: c.y - h + 2, x2: x1 + w, y2: c.y + 3 };
    };
    const inside = (b: Box) =>
      b.x1 >= 2 && b.x2 <= width - 2 && b.y1 >= 2 && b.y2 <= height - 2;
    const clear = (b: Box) => !occupied.some((o) => overlaps(o, b));
    const offLines = (b: Box) => !lineBoxes.some((o) => overlaps(o, b));
    const pick =
      cands.find((c) => {
        const b = boxOf(c);
        return inside(b) && clear(b) && offLines(b);
      }) ??
      cands.find((c) => {
        const b = boxOf(c);
        return inside(b) && clear(b);
      }) ??
      (strong ? (cands.find((c) => inside(boxOf(c))) ?? cands[0]) : undefined);
    if (!pick) continue;
    occupied.push(boxOf(pick));
    labels.push(pick);
  }

  return labels;
}
