/**
 * Region hero map: where each highlight photo goes on desktop, and where each
 * place label goes on the phone map. Everything is worked out at build time
 * on a fixed design stage, then rendered in percentages so it scales.
 *
 * Desktop: each photo is placed by hand with `photoOffset`, the photo's
 * top-left corner relative to its pin, in stage px. Photos without an offset
 * (or a region with none at all) fall back to automatic placement: the
 * nearest free spot to the pin that keeps clear of the name, other pins and
 * photos, and doesn't cover much land or cross another leader line.
 */
import type { RegionSilhouette } from "~/lib/regionSilhouette";

/** Design stage, in px at a 1312px wide content column. */
export const STAGE_W = 1312;
export const STAGE_H = 700;
/** How far photos may hang below the coloured band. */
export const MAX_BLEED = 100;
/** Photo size on the stage (4:3). */
export const PRINT_W = 176;
export const PRINT_H = 132;
/** Gap kept between the lowest photo and the bottom of the stage. */
const EDGE_CLEARANCE = 24;
/** Preferred length of a leader line, pin to photo corner. */
const LEADER_LENGTH = 48;
/** Pins closer than this on an axis don't constrain their photos' order. */
const ORDER_MARGIN = 12;
/** Cost of two photos sitting in the opposite order to their pins. */
const ORDER_PENALTY = 15000;

/** Box the map is fitted into, clear of the name on the left. */
const MAP_BOX = { x: 420, y: 16, w: 880, h: 664 };
/** Name block: bottom-left, this wide; size of the name type on the stage. */
export const NAME_MAX_W = 440;
export const NAME_SIZE = 168;
const NAME_BOTTOM = 40;
/** Bottom-right corner kept clear for the link to the next region. */
const NEXT_LINK: [number, number, number, number] = [STAGE_W - 260, STAGE_H - 48, STAGE_W, STAGE_H + MAX_BLEED];
/** Rough advance per character of the uppercase display face, in em. */
const CHAR_EM = 0.37;

export type HeroPlace = {
  place: string;
  coords: [number, number];
  /** Photo's top-left corner relative to the pin, in stage px. */
  photoOffset?: [number, number];
};

export type PlacedPrint = {
  /** Top-left of the photo on the stage. */
  x: number;
  y: number;
  /** Pin on the stage. */
  pin: [number, number];
  /** Where the leader line meets the photo. */
  anchor: [number, number];
};

export type DesktopLayout = {
  map: { x: number; y: number; w: number; h: number };
  prints: PlacedPrint[];
  /** How far the lowest photo hangs below the stage. */
  bleed: number;
};

type Rect = [number, number, number, number];

function nameLines(name: string, size: number, maxW: number): number {
  const words = name.toUpperCase().split(/\s+/);
  let lines = 1;
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && t.length * CHAR_EM * size > maxW) {
      lines += 1;
      cur = w;
    } else cur = t;
  }
  return lines;
}

/** Summed-area table of land cells, so "how much land under this rect" is O(1). */
function landTable(sil: RegionSilhouette, ox: number, oy: number, k: number, cell: number) {
  const cols = Math.ceil(STAGE_W / cell);
  const rows = Math.ceil((STAGE_H + MAX_BLEED) / cell);
  const rings = sil.rings.map((r) => r.map(([x, y]) => [ox + x * k, oy + y * k] as [number, number]));
  const boxes = rings.map((r) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of r) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1] as Rect;
  });
  const inside = (px: number, py: number) => {
    let hit = false;
    rings.forEach((r, ri) => {
      const b = boxes[ri]!;
      if (px < b[0] || px > b[2] || py < b[1] || py > b[3]) return;
      let c = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i]!;
        const [xj, yj] = r[j]!;
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
      }
      if (c) hit = !hit;
    });
    return hit;
  };
  const sat = new Float64Array((cols + 1) * (rows + 1));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = inside((c + 0.5) * cell, (r + 0.5) * cell) ? 1 : 0;
      sat[(r + 1) * (cols + 1) + c + 1] =
        v + sat[r * (cols + 1) + c + 1]! + sat[(r + 1) * (cols + 1) + c]! - sat[r * (cols + 1) + c]!;
    }
  }
  return ([x0, y0, x1, y1]: Rect) => {
    const c0 = Math.max(0, Math.min(cols, Math.floor(x0 / cell)));
    const c1 = Math.max(0, Math.min(cols, Math.floor(x1 / cell)));
    const r0 = Math.max(0, Math.min(rows, Math.floor(y0 / cell)));
    const r1 = Math.max(0, Math.min(rows, Math.floor(y1 / cell)));
    const sum =
      sat[r1 * (cols + 1) + c1]! - sat[r0 * (cols + 1) + c1]! - sat[r1 * (cols + 1) + c0]! + sat[r0 * (cols + 1) + c0]!;
    const area = Math.max(1, (c1 - c0) * (r1 - r0));
    return sum / area;
  };
}

const cross = (a: number[], b: number[], c: number[]) =>
  (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
function segmentsCross(a: number[], b: number[], c: number[], d: number[]) {
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
}
function segmentHitsRect(a: number[], b: number[], [x0, y0, x1, y1]: Rect) {
  const inR = (p: number[]) => p[0]! > x0 && p[0]! < x1 && p[1]! > y0 && p[1]! < y1;
  if (inR(a) || inR(b)) return true;
  const e: [number[], number[]][] = [
    [[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]],
  ];
  return e.some(([c, d]) => segmentsCross(a, b, c, d));
}

type Spot = { rect: Rect; cx: number; cy: number };
type Ctx = {
  pins: [number, number][];
  avoid: Rect[];
  land: (r: Rect) => number;
};

/**
 * Where the photo's leader meets it: the nearest corner when the pin sits
 * diagonally off the photo, or the middle of the nearest edge when the pin
 * lines up with the photo on one axis.
 */
function anchorFor([px, py]: [number, number], rect: Rect): Spot {
  const [x0, y0, x1, y1] = rect;
  const nearX = px < (x0 + x1) / 2 ? x0 : x1;
  const nearY = py < (y0 + y1) / 2 ? y0 : y1;
  if (px >= x0 && px <= x1) return { rect, cx: (x0 + x1) / 2, cy: nearY };
  if (py >= y0 && py <= y1) return { rect, cx: nearX, cy: (y0 + y1) / 2 };
  return { rect, cx: nearX, cy: nearY };
}

/** How bad photo `i` is at `spot`, given the other photos' spots. */
function penalty(i: number, spot: Spot, spots: (Spot | undefined)[], ctx: Ctx): number {
  const [px, py] = ctx.pins[i]!;
  const { rect, cx, cy } = spot;
  let pen = 0;
  const others = spots.filter((s, j): s is Spot => !!s && j !== i);
  for (const a of [...others.map((s) => s.rect), ...ctx.avoid]) {
    const ox = Math.max(0, Math.min(rect[2] + 16, a[2]) - Math.max(rect[0] - 16, a[0]));
    const oy = Math.max(0, Math.min(rect[3] + 16, a[3]) - Math.max(rect[1] - 16, a[1]));
    pen += ox * oy * 60;
  }
  for (const [qx, qy] of ctx.pins) {
    if (rect[0] - 16 < qx && qx < rect[2] + 16 && rect[1] - 16 < qy && qy < rect[3] + 16) pen += 60000;
  }
  pen += ctx.land(rect) * 600;
  // Prefer the pin diagonally off the corner rather than beside an edge.
  const outsideX = px < rect[0] || px > rect[2];
  const outsideY = py < rect[1] || py > rect[3];
  if (!outsideX || !outsideY) pen += 4000;
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  const dist = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = flat, 90 = upright
  pen += Math.max(0, Math.abs(angle - 45) - 15) * 1000;
  pen += Math.abs(dist - LEADER_LENGTH) * 30 + (dist < 28 ? 3000 : 0) + Math.max(0, dist - 100) ** 2 * 2;
  spots.forEach((s, j) => {
    if (!s || j === i) return;
    const pj = ctx.pins[j]!;
    const ordered = true;
    // Keep the photos in the same order as their pins: a pin clearly west
    // (or north) of another gets its photo west (or north) of the other's.
    const [ax, ay] = [(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2];
    const [bx, by] = [(s.rect[0] + s.rect[2]) / 2, (s.rect[1] + s.rect[3]) / 2];
    if (ordered && Math.abs(px - pj[0]) > ORDER_MARGIN && Math.sign(px - pj[0]) !== Math.sign(ax - bx)) pen += ORDER_PENALTY;
    if (ordered && Math.abs(py - pj[1]) > ORDER_MARGIN && Math.sign(py - pj[1]) !== Math.sign(ay - by)) pen += ORDER_PENALTY;
    if (segmentsCross([px, py], [cx, cy], pj, [s.cx, s.cy])) pen += 40000;
    if (segmentHitsRect(pj, [s.cx, s.cy], rect)) pen += 40000;
    if (segmentHitsRect([px, py], [cx, cy], s.rect)) pen += 40000;
  });
  return pen;
}

const total = (spots: Spot[], ctx: Ctx) =>
  spots.reduce((sum, s, i) => sum + penalty(i, s, spots, ctx), 0);

/** Best grid spot for photo `i`, with the others fixed. */
function bestSpot(i: number, spots: (Spot | undefined)[], ctx: Ctx): { spot: Spot; pen: number } {
  let best: { spot: Spot; pen: number } | undefined;
  const step = 10;
  for (let tx = 360; tx <= STAGE_W - 16 - PRINT_W; tx += step) {
    // Photos always stay inside the stage, with a little room at the bottom.
    for (let ty = 8; ty <= STAGE_H - EDGE_CLEARANCE - PRINT_H; ty += step) {
      const spot = anchorFor(ctx.pins[i]!, [tx, ty, tx + PRINT_W, ty + PRINT_H]);
      const pen = penalty(i, spot, spots, ctx);
      if (!best || pen < best.pen) best = { spot, pen };
    }
  }
  return best!;
}

/**
 * Greedy placement in the given order, then local improvement: swap pairs of
 * photos, and re-place each photo with the others fixed, until nothing helps.
 */
function place(
  pins: [number, number][],
  order: number[],
  avoid: Rect[],
  land: (r: Rect) => number,
): { total: number; out: PlacedPrint[] } {
  const ctx: Ctx = { pins, avoid, land };
  const spots: (Spot | undefined)[] = new Array(pins.length);
  for (const i of order) spots[i] = bestSpot(i, spots, ctx).spot;
  let current = spots as Spot[];
  let score = total(current, ctx);
  for (let round = 0; round < 4; round++) {
    let improved = false;
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const next = [...current];
        next[i] = anchorFor(pins[i]!, current[j]!.rect);
        next[j] = anchorFor(pins[j]!, current[i]!.rect);
        const s = total(next, ctx);
        if (s < score - 1) {
          current = next;
          score = s;
          improved = true;
        }
      }
    }
    for (const i of order) {
      const next = [...current];
      next[i] = bestSpot(i, current, ctx).spot;
      const s = total(next, ctx);
      if (s < score - 1) {
        current = next;
        score = s;
        improved = true;
      }
    }
    if (!improved) break;
  }
  const out = current.map((s, i) => ({
    x: s.rect[0],
    y: s.rect[1],
    pin: pins[i]!,
    anchor: [s.cx, s.cy] as [number, number],
  }));
  return { total: score, out };
}

/** Automatic placement: tries a few orders and keeps the cleanest result. */
function placeAutomatically(
  pins: [number, number][],
  avoid: Rect[],
  land: (r: Rect) => number,
): PlacedPrint[] {
  const idx = pins.map((_, i) => i);
  const crowd = (i: number) =>
    pins.filter((q) => Math.hypot(q[0] - pins[i]![0], q[1] - pins[i]![1]) < 160).length;
  const orders = [
    [...idx].sort((a, b) => pins[b]![1] - pins[a]![1]),
    idx,
    [...idx].reverse(),
    [...idx].sort((a, b) => pins[a]![1] - pins[b]![1]),
    [...idx].sort((a, b) => pins[a]![0] - pins[b]![0]),
    [...idx].sort((a, b) => pins[b]![0] - pins[a]![0]),
    [...idx].sort((a, b) => crowd(b) - crowd(a)),
  ];
  let best: { total: number; out: PlacedPrint[] } | undefined;
  for (const o of orders) {
    const res = place(pins, o, avoid, land);
    if (!best || res.total < best.total) best = res;
  }
  return best!.out;
}

/**
 * Hand placement: photos with a `photoOffset` go exactly there; any without
 * one are placed automatically around them.
 */
function placeByHand(
  places: HeroPlace[],
  pins: [number, number][],
  avoid: Rect[],
  land: (r: Rect) => number,
): PlacedPrint[] {
  const ctx: Ctx = { pins, avoid, land };
  const spots: (Spot | undefined)[] = places.map((p, i) => {
    if (!p.photoOffset) return undefined;
    const [px, py] = pins[i]!;
    const x = px + p.photoOffset[0];
    const y = py + p.photoOffset[1];
    return anchorFor(pins[i]!, [x, y, x + PRINT_W, y + PRINT_H]);
  });
  places.forEach((p, i) => {
    if (!p.photoOffset) spots[i] = bestSpot(i, spots, ctx).spot;
  });
  return spots.map((s, i) => ({
    x: s!.rect[0],
    y: s!.rect[1],
    pin: pins[i]!,
    anchor: [s!.cx, s!.cy] as [number, number],
  }));
}

const desktopCache = new Map<string, DesktopLayout>();

export function desktopLayout(
  key: string,
  name: string,
  sil: RegionSilhouette,
  places: HeroPlace[],
  /**
   * Optional: slide the finished map (silhouette, pins, photos) by this many
   * stage px, without changing the photo arrangement.
   */
  shift: { x?: number; y?: number } = {},
): DesktopLayout {
  const hit = desktopCache.get(key);
  if (hit) return hit;
  const k = Math.min(MAP_BOX.w / sil.width, MAP_BOX.h / sil.height);
  const w = sil.width * k;
  const h = sil.height * k;
  const ox = MAP_BOX.x + (MAP_BOX.w - w) / 2;
  const oy = MAP_BOX.y + (MAP_BOX.h - h) / 2;
  const pins = places.map((p) => {
    const [vx, vy] = sil.project(p.coords[0], p.coords[1]);
    return [ox + vx * k, oy + vy * k] as [number, number];
  });
  const lines = nameLines(name, NAME_SIZE, NAME_MAX_W);
  const nameH = lines * NAME_SIZE * 0.82 + 16 + 2 * 20 * 1.35;
  const title: Rect = [0, STAGE_H - NAME_BOTTOM - nameH - 10, NAME_MAX_W + 60, STAGE_H + MAX_BLEED];
  const land = landTable(sil, ox, oy, k, 8);

  const prints = places.some((p) => p.photoOffset)
    ? placeByHand(places, pins, [title, NEXT_LINK], land)
    : placeAutomatically(pins, [title, NEXT_LINK], land);
  const dx = shift.x ?? 0;
  const dy = shift.y ?? 0;
  const moved = prints.map((p) => ({
    x: p.x + dx,
    y: p.y + dy,
    pin: [p.pin[0] + dx, p.pin[1] + dy] as [number, number],
    anchor: [p.anchor[0] + dx, p.anchor[1] + dy] as [number, number],
  }));
  const bleed = Math.max(0, ...moved.map((p) => p.y + PRINT_H - STAGE_H));
  const result = { map: { x: ox + dx, y: oy + dy, w, h }, prints: moved, bleed };
  desktopCache.set(key, result);
  return result;
}

/* ---------- Phone map: dots with place labels ---------- */

/** Phone map is designed at this width (px) and scales with the screen. */
const PHONE_MAP_W = 328;
const PHONE_MAP_MAX_H = 300;
const LABEL_PX = 10;
const LABEL_CHAR_PX = 6.9;
/** Matches `letter-spacing` on `.region-hero__phone-label`. */
const LABEL_TRACKING_PX = 1;
/** Clear space from the pin centre to the near side of the label. */
const LABEL_GAP_PX = 10;

export type PhoneLabel = {
  x: number;
  y: number;
  text: string;
  /** `end` when the label sits left of its pin, so the gap does not depend on text width. */
  anchor: "start" | "end";
};
export type PhoneLayout = {
  /** Pins and labels in silhouette viewBox units. */
  pins: [number, number][];
  labels: PhoneLabel[];
  /** viewBox units per design px, for sizing type and dots. */
  unit: number;
  /** Extra viewBox room around the silhouette so labels never clip. */
  pad: { left: number; right: number };
};

export function phoneLayout(sil: RegionSilhouette, places: HeroPlace[]): PhoneLayout {
  const k = Math.min(PHONE_MAP_W / sil.width, PHONE_MAP_MAX_H / sil.height); // px per unit
  const pins = places.map((p) => sil.project(p.coords[0], p.coords[1]));
  const px = pins.map(([x, y]) => [x * k, y * k] as [number, number]);
  const mapW = sil.width * k;
  const mid = mapW / 2;

  // Pins sitting on top of each other share one label.
  const groups: number[][] = [];
  px.forEach((p, i) => {
    const g = groups.find((g) => g.some((j) => Math.hypot(p[0] - px[j]![0], p[1] - px[j]![1]) < 14));
    if (g) g.push(i);
    else groups.push([i]);
  });

  const overlaps = (a: Rect, b: Rect) =>
    !(a[2] + 2 < b[0] || b[2] + 2 < a[0] || a[3] < b[1] || b[3] < a[1]);
  const placed: { text: string; extra: number; rect: Rect; anchor: "start" | "end" }[] = [];
  let minX = 0, maxX = mapW;
  for (const g of groups) {
    const xs = g.map((i) => px[i]![0]);
    const ys = g.map((i) => px[i]![1]);
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const text = places[g[0]!]!.place.toUpperCase();
    const chars = text.length + (g.length > 1 ? 3 : 0);
    // Slack covers wide capitals (M, W) so a left label's box reaches its real left edge.
    const lw = chars * LABEL_CHAR_PX + Math.max(0, chars - 1) * LABEL_TRACKING_PX + 4;
    const sides = cx >= mid ? [true, false] : [false, true];
    const opts: { rect: Rect; anchor: "start" | "end" }[] = [];
    for (const right of sides) {
      for (const dy of [0, -12, 12, -22, 22]) {
        const x0 = right ? Math.max(...xs) + LABEL_GAP_PX : Math.min(...xs) - LABEL_GAP_PX - lw;
        opts.push({
          rect: [x0, cy - 8 + dy, x0 + lw, cy + 8 + dy],
          anchor: right ? "start" : "end",
        });
      }
    }
    const others = px.filter((_, i) => !g.includes(i));
    const free = (r: Rect) =>
      !placed.some((l) => overlaps(r, l.rect)) &&
      !others.some(([qx, qy]) => overlaps(r, [qx - 6, qy - 6, qx + 6, qy + 6]));
    const pick =
      opts.find((o) => free(o.rect)) ??
      opts.find((o) => !placed.some((l) => overlaps(o.rect, l.rect)));
    if (!pick) {
      const near = placed.reduce((a, b) =>
        Math.abs((a.rect[1] + a.rect[3]) / 2 - cy) < Math.abs((b.rect[1] + b.rect[3]) / 2 - cy) ? a : b,
      );
      near.extra += g.length;
      continue;
    }
    minX = Math.min(minX, pick.rect[0]);
    maxX = Math.max(maxX, pick.rect[2]);
    placed.push({ text, extra: g.length - 1, rect: pick.rect, anchor: pick.anchor });
  }
  const labels = placed.map((l) => ({
    // Left labels are anchored on the edge facing the pin, so a wide word
    // grows away from the dot instead of into it.
    x: (l.anchor === "end" ? l.rect[2] : l.rect[0]) / k,
    y: (l.rect[1] + 12) / k,
    text: l.extra ? `${l.text} +${l.extra}` : l.text,
    anchor: l.anchor,
  }));
  return {
    pins,
    labels,
    unit: 1 / k,
    pad: { left: Math.max(0, -minX + 4) / k, right: Math.max(0, maxX - mapW + 4) / k },
  };
}

export const LABEL_SIZE_PX = LABEL_PX;
