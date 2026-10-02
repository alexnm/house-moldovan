import type { ImageMetadata } from "astro";
import type { MarkdownHeading } from "@astrojs/markdown-remark";
import type { ResolvedLocation } from "~/lib/locations";
import { placeCoverFromFrontmatterPath } from "~/lib/placeCover";
import {
  archLatLngs,
  routeCosLat,
  routeFrame,
  type RouteMap,
  type RouteMapSegment,
  type RouteMapTransport,
} from "~/lib/routeMap";
import { routeAtlas } from "~/lib/routeAtlas";

export type { RouteMap } from "~/lib/routeMap";

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

export function buildRouteMap(
  days: ItineraryDayRow[],
  parts: ItineraryPart[],
): RouteMap {
  const stopsLoc = uniqueStops(days);
  const seenStop = new Set(stopsLoc.map((l) => l.qualifiedId));
  for (const part of parts) {
    if (seenStop.has(part.anchor.qualifiedId)) continue;
    seenStop.add(part.anchor.qualifiedId);
    stopsLoc.push(part.anchor);
  }

  const locById = new Map(stopsLoc.map((l) => [l.qualifiedId, l]));
  const cosLat = routeCosLat(stopsLoc.map((l) => [l.lat, l.lng]));
  const seenBase = new Set<string>();
  const uniqueBases = parts
    .map((part) => part.anchor)
    .filter((loc) => {
      if (seenBase.has(loc.qualifiedId)) return false;
      seenBase.add(loc.qualifiedId);
      return true;
    });
  const centroid =
    uniqueBases.length > 0
      ? {
          lat:
            uniqueBases.reduce((sum, loc) => sum + loc.lat, 0) /
            uniqueBases.length,
          lng:
            uniqueBases.reduce((sum, loc) => sum + loc.lng, 0) /
            uniqueBases.length,
        }
      : undefined;

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
  const addSegment = (
    aId: string,
    bId: string,
    transfer: boolean,
    away?: { lat: number; lng: number },
  ) => {
    const key = edgeKey(aId, bId);
    const a = locById.get(aId);
    const b = locById.get(bId);
    if (!a || !b || (a.lat === b.lat && a.lng === b.lng)) return;
    const latlngs: [number, number][] = transfer
      ? archLatLngs(a, b, cosLat, away, centroid)
      : [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ];
    const existing = segByKey.get(key);
    if (existing) {
      if (transfer && !existing.transfer) {
        existing.transfer = true;
        existing.latlngs = latlngs;
      }
      return;
    }
    segByKey.set(key, { latlngs, transfer });
  };

  for (let i = 1; i < visits.length; i++) {
    addSegment(visits[i - 1]!.id, visits[i]!.id, false);
  }

  // A→B bows away from C, the next overnight after this transfer, so a
  // clockwise loop and a counterclockwise one both open outward.
  const closed =
    parts.length > 2 &&
    parts[0]!.anchor.qualifiedId === parts.at(-1)!.anchor.qualifiedId;
  const awayForTransfer = (
    fromPart: number,
  ): { lat: number; lng: number } | undefined => {
    const here = parts[fromPart]!.anchor.qualifiedId;
    const there = parts[fromPart + 1]?.anchor.qualifiedId;
    const pick = (loc: { qualifiedId: string; lat: number; lng: number }) =>
      loc.qualifiedId !== here && loc.qualifiedId !== there ? loc : undefined;
    const next = parts[fromPart + 2]?.anchor;
    if (next) {
      const loc = pick(next);
      if (loc) return loc;
    }
    if (closed) {
      const wrap = parts[1]?.anchor;
      if (wrap) {
        const loc = pick(wrap);
        if (loc) return loc;
      }
    }
    const prev = parts[fromPart - 1]?.anchor;
    return prev ? pick(prev) : undefined;
  };

  // A transfer runs from the last time you are at a base until you arrive at
  // the next one. Stopovers on that stretch stay on the dashed line. A loop
  // that comes back to the base before you leave is a day trip.
  const transport: RouteMapTransport[] = [];
  let cursor = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    const fromId = parts[i]!.anchor.qualifiedId;
    const toId = parts[i + 1]!.anchor.qualifiedId;
    let arrival = -1;
    for (let j = cursor; j < visits.length; j++) {
      if (visits[j]!.id !== toId) continue;
      let returned = false;
      for (let step = j + 1; step < visits.length; step++) {
        const visit = visits[step]!;
        if (visit.base > i) break;
        if (visit.id === fromId && visit.base <= i) {
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
    const away = awayForTransfer(i);
    let best: { a: string; b: string; len: number } | undefined;
    for (let j = start; j < arrival; j++) {
      const aId = visits[j]!.id;
      const bId = visits[j + 1]!.id;
      addSegment(aId, bId, true, away);
      const a = locById.get(aId);
      const b = locById.get(bId);
      if (!a || !b) continue;
      const len = Math.hypot((b.lng - a.lng) * cosLat, b.lat - a.lat);
      if (!best || len > best.len) best = { a: aId, b: bId, len };
    }
    const mode = parts[i]!.toNext;
    const seg = best ? segByKey.get(edgeKey(best.a, best.b)) : undefined;
    if (mode && seg && best && best.len > 0) {
      transport.push({ latlngs: seg.latlngs, mode });
    }
    cursor = arrival;
  }

  const segments = [...segByKey.values()];

  const partsByStop = new Map<string, number[]>();
  for (const part of parts) {
    if (part.hidden || partsByStop.has(part.anchor.qualifiedId)) continue;
    partsByStop.set(part.anchor.qualifiedId, [part.number]);
  }

  const stops = stopsLoc.map((l) => ({
    id: l.qualifiedId,
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    parts: partsByStop.get(l.qualifiedId) ?? [],
  }));

  const points: [number, number][] = [
    ...stops.map((s) => [s.lat, s.lng] as [number, number]),
    ...segments.flatMap((s) => s.latlngs),
  ];

  const frame = routeFrame(points);
  return {
    ...frame,
    segments,
    transport,
    stops,
    atlas: routeAtlas(frame.bounds),
  };
}
