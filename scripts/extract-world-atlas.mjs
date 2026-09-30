/**
 * World outlines for the itinerary atlas map: every Natural Earth 10m country
 * with its name and label point, plus large lakes. Rings are `[lat, lng]`,
 * simplified to about a kilometre, which holds up to the zooms itineraries use.
 * Usage: node scripts/extract-world-atlas.mjs
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const COUNTRIES_URL = `${BASE}/ne_10m_admin_0_countries.geojson`;
const LAKES_URL = `${BASE}/ne_10m_lakes.geojson`;
const OUT = join(
  import.meta.dirname,
  "../apps/en/src/data/world-atlas.json",
);

const TOLERANCE = 0.01;
const MIN_LAKE_SCALERANK = 6;
const round = (n) => Math.round(n * 1000) / 1000;

function sqSegDist(p, a, b) {
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

function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  const sq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = sq;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxSq) {
        maxSq = d;
        index = i;
      }
    }
    if (index >= 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** GeoJSON `[lng, lat]` ring → simplified, rounded `[lat, lng]` ring. */
function ringOf(coords) {
  const out = [];
  for (const [lng, lat] of simplify(coords, TOLERANCE)) {
    const pt = [round(lat), round(lng)];
    const prev = out.at(-1);
    if (prev && prev[0] === pt[0] && prev[1] === pt[1]) continue;
    out.push(pt);
  }
  return out.length >= 4 ? out : null;
}

function ringsOf(geometry) {
  const polys =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const rings = [];
  for (const poly of polys) {
    for (const ring of poly) {
      const r = ringOf(ring);
      if (r) rings.push(r);
    }
  }
  return rings;
}

async function load(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

const [countriesGeo, lakesGeo] = await Promise.all([
  load(COUNTRIES_URL),
  load(LAKES_URL),
]);

const countries = [];
for (const f of countriesGeo.features) {
  if (!f.geometry) continue;
  const p = f.properties;
  const rings = ringsOf(f.geometry);
  if (!rings.length) continue;
  countries.push({
    name: p.NAME_EN || p.NAME,
    rank: p.LABELRANK ?? 5,
    label: [round(p.LABEL_Y), round(p.LABEL_X)],
    rings,
  });
}

const lakes = [];
for (const f of lakesGeo.features) {
  if (!f.geometry) continue;
  if ((f.properties.scalerank ?? 99) > MIN_LAKE_SCALERANK) continue;
  lakes.push(...ringsOf(f.geometry));
}

writeFileSync(OUT, JSON.stringify({ countries, lakes }));
console.log(
  `Wrote ${countries.length} countries and ${lakes.length} lake rings to ${OUT}`,
);
