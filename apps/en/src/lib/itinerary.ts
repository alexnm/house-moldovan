import type { ImageMetadata } from "astro";
import type { MarkdownHeading } from "@astrojs/markdown-remark";
import type { ResolvedLocation } from "~/lib/locations";
import { placeCoverFromFrontmatterPath } from "~/lib/placeCover";

/** Ordered location names for the hero byline (each name once, in order of first appearance). */
export function heroRouteFromLocations(
  locations: readonly ResolvedLocation[],
): string {
  const seen = new Set<string>();
  const seq: string[] = [];
  for (const loc of locations) {
    if (seen.has(loc.qualifiedId)) continue;
    seen.add(loc.qualifiedId);
    seq.push(loc.name);
  }
  return seq.join(" → ");
}

export type ItineraryDayRow = {
  dayIndex: number;
  description: string;
  locations: ResolvedLocation[];
};

export type TransportMode = "car" | "bus" | "train" | "ferry" | "plane";

/** One overnight base, shown in the opening route list. */
export type ItineraryPart = {
  number: number;
  title: string;
  /** Country flag for the base location. */
  flag: string;
  /** Heading slug in the body, when a day-range heading covers this base. */
  slug?: string;
  from: number;
  to: number;
  days: ItineraryDayRow[];
  /** How you travel from this base to the next one. */
  toNext?: TransportMode;
  /** Return point. Not listed, not counted, and it reuses an existing pin. */
  hidden?: boolean;
  /** The town you stay in. Numbered pins sit here. */
  anchor: ResolvedLocation;
  image?: ImageMetadata;
  imageAlt?: string;
};

export type ItineraryBaseInput = {
  location: ResolvedLocation;
  /** Shown instead of the location name. */
  title?: string;
  /** Card photo. Falls back to the location picture. */
  image?: ImageMetadata;
  toNext?: TransportMode;
  hidden?: boolean;
  days: ItineraryDayRow[];
};

/** Distinct towns you stay in. A repeat, and a hidden return, are left out. */
export function itineraryBaseCount(
  parts: readonly { hidden?: boolean; anchor: { qualifiedId: string } }[],
): number {
  const seen = new Set<string>();
  for (const part of parts) {
    if (part.hidden) continue;
    seen.add(part.anchor.qualifiedId);
  }
  return seen.size;
}

export function itineraryDayCount(
  bases: readonly { days: readonly unknown[] }[],
): number {
  return bases.reduce((n, base) => n + base.days.length, 0);
}

const DAY_RANGE_HEADING = /^Days?\s+(\d+)(?:\s*[-–—]\s*(\d+))?\s*:\s*(.+)$/i;

/** Parse "Days 1–3: Salzburg and around" → { from: 1, to: 3, title }. */
export function parseDayRangeHeading(
  text: string,
): { from: number; to: number; title: string } | undefined {
  const m = DAY_RANGE_HEADING.exec(text.trim());
  if (!m) return undefined;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : from;
  if (!from || to < from) return undefined;
  return { from, to, title: m[3]!.trim() };
}

/**
 * Turn overnight bases into the opening route list.
 * A `## Days N–M` heading that covers the base's first day supplies the link.
 */
export function buildItineraryBases(
  bases: readonly ItineraryBaseInput[],
  headings: readonly MarkdownHeading[],
): ItineraryPart[] {
  const dayCount = itineraryDayCount(bases);
  const ranges = headings
    .filter((h) => h.depth === 2)
    .map((h) => ({ slug: h.slug, parsed: parseDayRangeHeading(h.text) }))
    .filter(
      (h): h is { slug: string; parsed: NonNullable<typeof h.parsed> } =>
        Boolean(h.parsed) && h.parsed!.from <= dayCount,
    )
    .sort((a, b) => a.parsed.from - b.parsed.from);

  return bases.map((base, i) => {
    const from = base.days[0]?.dayIndex ?? 0;
    const to = base.days.at(-1)?.dayIndex ?? from;
    let match: (typeof ranges)[number] | undefined;
    let bestOverlap = 0;
    if (base.days.length > 0) {
      for (const range of ranges) {
        const overlap =
          Math.min(to, range.parsed.to) - Math.max(from, range.parsed.from) + 1;
        if (overlap <= 0) continue;
        const closer =
          overlap > bestOverlap ||
          (overlap === bestOverlap &&
            range.parsed.from > (match?.parsed.from ?? 0));
        if (closer) {
          match = range;
          bestOverlap = overlap;
        }
      }
    }
    const title = base.title || base.location.name;
    return {
      number: i + 1,
      title,
      flag: base.location.country.data.flag,
      slug: match?.slug,
      from,
      to,
      days: [...base.days],
      toNext: base.toNext,
      hidden: base.hidden,
      anchor: base.location,
      image:
        base.image ?? placeCoverFromFrontmatterPath(base.location.image),
      imageAlt: title,
    };
  });
}

/** Unique stops in visiting order. */
export function uniqueStops(days: ItineraryDayRow[]): ResolvedLocation[] {
  const seen = new Set<string>();
  const out: ResolvedLocation[] = [];
  for (const d of days) {
    for (const loc of d.locations) {
      if (seen.has(loc.qualifiedId)) continue;
      seen.add(loc.qualifiedId);
      out.push(loc);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Route map: a small static SVG projection, no tiles.                 */
/* ------------------------------------------------------------------ */

export type RouteMapPoint = {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Part numbers anchored here (pins); empty = plain stop. */
  parts: number[];
};

export type RouteMapSegment = {
  d: string;
  /** Hop between bases, including stopovers. Day trips are solid. */
  transfer: boolean;
};

export type RouteMapTransportIcon = {
  x: number;
  y: number;
  mode: TransportMode;
};

export type RouteMapLabel = {
  x: number;
  y: number;
  text: string;
  anchor: "start" | "middle" | "end";
  strong: boolean;
};

export type RouteMapPin = { x: number; y: number; n: number };

export type RouteMap = {
  width: number;
  height: number;
  gridX: number[];
  gridY: number[];
  segments: RouteMapSegment[];
  /** Transport glyph beside each dashed hop between bases. */
  transportIcons: RouteMapTransportIcon[];
  stops: RouteMapPoint[];
  pins: RouteMapPin[];
  labels: RouteMapLabel[];
  scale: { km: number; px: number; x: number; y: number };
};

function niceKm(target: number): number {
  const pow = 10 ** Math.floor(Math.log10(target));
  for (const m of [1, 2, 5, 10]) {
    if (m * pow >= target * 0.75) return m * pow;
  }
  return 10 * pow;
}

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) =>
  a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

export function buildRouteMap(
  days: ItineraryDayRow[],
  parts: ItineraryPart[],
  opts: { width?: number; maxHeight?: number; pad?: number } = {},
): RouteMap {
  const W = opts.width ?? 560;
  const maxH = opts.maxHeight ?? 880;
  const pad = opts.pad ?? 56;

  const stopsLoc = uniqueStops(days);
  const seenStop = new Set(stopsLoc.map((l) => l.qualifiedId));
  for (const part of parts) {
    if (seenStop.has(part.anchor.qualifiedId)) continue;
    seenStop.add(part.anchor.qualifiedId);
    stopsLoc.push(part.anchor);
  }
  const lats = stopsLoc.map((l) => l.lat);
  const lngs = stopsLoc.map((l) => l.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = Math.max((maxLng - minLng) * k, 0.3);
  const spanY = Math.max(maxLat - minLat, 0.3);
  const s = Math.min((W - 2 * pad) / spanX, (maxH - 2 * pad) / spanY);
  const H = Math.max(320, Math.round(spanY * s + 2 * pad));
  const offX = (W - (maxLng - minLng) * k * s) / 2;
  const offY = (H - (maxLat - minLat) * s) / 2;
  const project = (l: ResolvedLocation) => ({
    x: Math.round(offX + (l.lng - minLng) * k * s),
    y: Math.round(offY + (maxLat - l.lat) * s),
  });

  const pos = new Map(stopsLoc.map((l) => [l.qualifiedId, project(l)]));

  // Visit order. A return to the same place is kept; only immediate repeats drop.
  const visits: { id: string; base: number }[] = [];
  parts.forEach((part, base) => {
    for (const day of part.days) {
      for (const loc of day.locations) {
        if (visits[visits.length - 1]?.id === loc.qualifiedId) continue;
        visits.push({ id: loc.qualifiedId, base });
      }
    }
    // A hidden return has no days of its own, so the path still has an endpoint.
    if (part.hidden && visits.at(-1)?.id !== part.anchor.qualifiedId) {
      visits.push({ id: part.anchor.qualifiedId, base });
    }
  });

  const edgeKey = (a: string, b: string) => [a, b].sort().join("|");
  const segByKey = new Map<string, RouteMapSegment>();
  // Same bow the old long transfers used: a quadratic bent off the chord.
  const arched = (p: { x: number; y: number }, q: { x: number; y: number }) => {
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const bend = 0.22;
    const cx = Math.round(mx - dy * bend);
    const cy = Math.round(my + dx * bend);
    return `M${p.x} ${p.y} Q${cx} ${cy} ${q.x} ${q.y}`;
  };
  const addSegment = (aId: string, bId: string, transfer: boolean) => {
    const key = edgeKey(aId, bId);
    const p = pos.get(aId);
    const q = pos.get(bId);
    if (!p || !q || (p.x === q.x && p.y === q.y)) return;
    const existing = segByKey.get(key);
    if (existing) {
      if (transfer && !existing.transfer) {
        existing.transfer = true;
        existing.d = arched(p, q);
      }
      return;
    }
    segByKey.set(key, {
      d: transfer ? arched(p, q) : `M${p.x} ${p.y} L${q.x} ${q.y}`,
      transfer,
    });
  };

  for (let i = 1; i < visits.length; i++) {
    addSegment(visits[i - 1]!.id, visits[i]!.id, false);
  }

  // A transfer runs from the last time you are at a base until you arrive at
  // the next one. Stopovers on that stretch stay on the dashed line. A loop
  // that comes back to the base before you leave is a day trip.
  const transportIcons: RouteMapTransportIcon[] = [];
  const ICON = 18;
  let cursor = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    const fromId = parts[i]!.anchor.qualifiedId;
    const toId = parts[i + 1]!.anchor.qualifiedId;
    let arrival = -1;
    for (let j = cursor; j < visits.length; j++) {
      if (visits[j]!.id !== toId) continue;
      let returned = false;
      for (let k = j + 1; k < visits.length; k++) {
        const step = visits[k]!;
        if (step.base > i) break;
        if (step.id === fromId && step.base <= i) {
          returned = true;
          break;
        }
      }
      if (!returned) {
        arrival = j;
        break;
      }
    }
    if (arrival < 0) continue;
    let start = cursor;
    for (let j = cursor; j < arrival; j++) {
      if (visits[j]!.id === fromId) start = j;
    }
    let best: { a: string; b: string; len: number } | undefined;
    for (let j = start; j < arrival; j++) {
      const a = visits[j]!.id;
      const b = visits[j + 1]!.id;
      addSegment(a, b, true);
      const p = pos.get(a);
      const q = pos.get(b);
      if (!p || !q) continue;
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (!best || len > best.len) best = { a, b, len };
    }
    const mode = parts[i]!.toNext;
    if (mode && best && best.len > 0) {
      const p = pos.get(best.a)!;
      const q = pos.get(best.b)!;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const gap = 16;
      // Midpoint of the arch (bend 0.22 peaks at half the control offset).
      const refX = (p.x + q.x) / 2 + nx * len * 0.11;
      const refY = (p.y + q.y) / 2 + ny * len * 0.11;
      const candidates = [1, -1].map((side) => ({
        x: Math.round(refX + nx * gap * side - ICON / 2),
        y: Math.round(refY + ny * gap * side - ICON / 2),
      }));
      const inside = (c: { x: number; y: number }) =>
        c.x >= 4 && c.y >= 4 && c.x + ICON <= W - 4 && c.y + ICON <= H - 4;
      const at =
        candidates.find(inside) ??
        candidates[0] ?? {
          x: Math.round(refX - ICON / 2),
          y: Math.round(refY - ICON / 2),
        };
      transportIcons.push({ ...at, mode });
    }
    cursor = arrival;
  }

  const segments = [...segByKey.values()];

  const partsByStop = new Map<string, number[]>();
  for (const part of parts) {
    if (part.hidden || partsByStop.has(part.anchor.qualifiedId)) continue;
    partsByStop.set(part.anchor.qualifiedId, [part.number]);
  }

  const stops: RouteMapPoint[] = stopsLoc.map((l) => ({
    id: l.qualifiedId,
    name: l.name,
    ...pos.get(l.qualifiedId)!,
    parts: partsByStop.get(l.qualifiedId) ?? [],
  }));

  const PIN_R = 11;
  const DOT_R = 5;
  const pins: RouteMapPin[] = [];
  const occupied: Box[] = [];
  for (const st of stops) {
    if (st.parts.length === 0) {
      occupied.push({
        x1: st.x - DOT_R,
        y1: st.y - DOT_R,
        x2: st.x + DOT_R,
        y2: st.y + DOT_R,
      });
      continue;
    }
    const n = st.parts.length;
    st.parts.forEach((num, i) => {
      const x = st.x + (i - (n - 1) / 2) * (PIN_R * 2 + 2);
      pins.push({ x, y: st.y, n: num });
    });
    const half = (n * (PIN_R * 2 + 2)) / 2;
    occupied.push({
      x1: st.x - half,
      y1: st.y - PIN_R,
      x2: st.x + half,
      y2: st.y + PIN_R,
    });
  }

  const pxPerKm = s / 111.32;
  const km = niceKm((W * 0.22) / pxPerKm);
  const scalePx = Math.round(km * pxPerKm);
  const scaleX = W - pad - scalePx;
  const scaleY = H - 22;
  occupied.push({
    x1: scaleX - 4,
    y1: scaleY - 20,
    x2: scaleX + scalePx + 4,
    y2: scaleY + 6,
  });
  for (const icon of transportIcons) {
    occupied.push({
      x1: icon.x - 2,
      y1: icon.y - 2,
      x2: icon.x + ICON + 2,
      y2: icon.y + ICON + 2,
    });
  }

  // Sample the drawn lines so labels can avoid sitting on top of them.
  const lineBoxes: Box[] = [];
  for (const sg of segments) {
    const n = sg.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const [x0, y0] = [n[0]!, n[1]!];
    const [cx, cy, x2, y2] =
      n.length === 6
        ? [n[2]!, n[3]!, n[4]!, n[5]!]
        : [(x0 + n[2]!) / 2, (y0 + n[3]!) / 2, n[2]!, n[3]!];
    for (let t = 0.04; t < 1; t += 0.04) {
      const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x2;
      const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y2;
      lineBoxes.push({ x1: x - 2, y1: y - 2, x2: x + 2, y2: y + 2 });
    }
  }

  // Greedy label placement: pins first, then plain stops. Prefer spots that
  // clear other labels, stops and lines; then allow crossing a line; plain
  // stops that still don't fit go unlabelled (the day list names them).
  const labels: RouteMapLabel[] = [];
  const ordered = [...stops].sort((a, b) => b.parts.length - a.parts.length);
  for (const st of ordered) {
    const strong = st.parts.length > 0;
    const r = strong ? (st.parts.length * (PIN_R * 2 + 2)) / 2 : DOT_R;
    const w = st.name.length * (strong ? 7.8 : 6.9);
    const h = strong ? 14 : 13;
    const mk = (
      x: number,
      y: number,
      anchor: RouteMapLabel["anchor"],
    ): RouteMapLabel => ({
      x: Math.round(x),
      y: Math.round(y),
      anchor,
      text: st.name,
      strong,
    });
    const cands: RouteMapLabel[] = [
      mk(st.x + r + 7, st.y + 5, "start"),
      mk(st.x - r - 7, st.y + 5, "end"),
      mk(st.x, st.y - r - 8, "middle"),
      mk(st.x, st.y + r + 17, "middle"),
      mk(st.x + r + 4, st.y - r - 4, "start"),
      mk(st.x - r - 4, st.y - r - 4, "end"),
      mk(st.x + r + 4, st.y + r + 14, "start"),
      mk(st.x - r - 4, st.y + r + 14, "end"),
    ];
    const boxOf = (c: RouteMapLabel): Box => {
      const x1 =
        c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - w : c.x - w / 2;
      return { x1, y1: c.y - h + 2, x2: x1 + w, y2: c.y + 3 };
    };
    const inside = (b: Box) =>
      b.x1 >= 2 && b.x2 <= W - 2 && b.y1 >= 2 && b.y2 <= H - 2;
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

  const step = Math.round(W / 5);
  const gridX = [1, 2, 3, 4].map((i) => i * step);
  const gridY: number[] = [];
  for (let y = step; y < H; y += step) gridY.push(y);

  return {
    width: W,
    height: H,
    gridX,
    gridY,
    segments,
    transportIcons,
    stops,
    pins,
    labels,
    scale: { km, px: scalePx, x: scaleX, y: scaleY },
  };
}
