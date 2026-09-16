/**
 * Extract simplified country outlines for map highlighting, from Natural Earth
 * 10m — or, for city-states where that is too coarse, from OSM coastline ways.
 * Usage: node scripts/extract-country-shape.mjs jordan argentina …
 *        node scripts/extract-country-shape.mjs --all
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const NE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";

/** Place slug → Natural Earth ISO_A3. */
const SLUG_TO_ISO = {
  argentina: "ARG",
  austria: "AUT",
  belgium: "BEL",
  brazil: "BRA",
  cambodia: "KHM",
  chile: "CHL",
  france: "FRA",
  israel: "ISR",
  italy: "ITA",
  japan: "JPN",
  jordan: "JOR",
  malaysia: "MYS",
  netherlands: "NLD",
  peru: "PER",
  poland: "POL",
  slovenia: "SVN",
  spain: "ESP",
  thailand: "THA",
  "united-arab-emirates": "ARE",
  uruguay: "URY",
  uzbekistan: "UZB",
  vietnam: "VNM",
};

/**
 * Drop overseas rings when a place slug should highlight only its European
 * mainland (Natural Earth admin-0 includes overseas departments).
 */
const METROPOLITAN_EUROPE_ONLY = new Set(["france"]);

/**
 * Natural Earth 10m is far too coarse for city-states (Singapore is 40 vertices
 * for the whole country), so these are traced from OpenStreetMap coastline ways
 * instead. Keyed by the OSM administrative relation that bounds the territory.
 */
const OSM_COASTLINE = {
  singapore: { relation: 536780, name: "Singapore" },
  "hong-kong": { relation: 913110, name: "Hong Kong" },
};

/** Point budget per OSM-traced country, spent where the coastline is busiest. */
const OSM_POINT_BUDGET = 2400;

/** Keep islands down to this fraction of the largest ring's area. */
const OSM_MIN_AREA_RATIO = 0.002;

/** Endpoint gap (degrees, ~110 m) that still counts as a closed ring. */
const OSM_SNAP_TOLERANCE = 0.0015;

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/** Default simplification for medium/large countries. */
const DEFAULT_SIMPLIFY = {
  minDistance: 0.08,
  maxPoints: 420,
  minAreaRatio: 0.04,
};

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
}

function simplifyRing(ring, minDistance) {
  if (ring.length <= 3) return ring;
  const out = [ring[0]];
  for (let i = 1; i < ring.length - 1; i += 1) {
    if (dist(ring[i], out[out.length - 1]) >= minDistance) out.push(ring[i]);
  }
  const last = ring[ring.length - 1];
  if (dist(last, out[out.length - 1]) >= minDistance) out.push(last);
  return out;
}

function downsample(ring, maxPoints) {
  if (ring.length <= maxPoints) return ring;
  const step = ring.length / maxPoints;
  const out = [];
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(ring[Math.floor(i * step)]);
  }
  return out;
}

/**
 * Douglas-Peucker: drops vertices that sit within `tolerance` of the line their
 * neighbours already describe, so detail survives where the coast actually bends.
 * `lngScale` compensates for longitude degrees being shorter away from the equator.
 */
function simplifyDouglasPeucker(ring, tolerance, lngScale) {
  if (ring.length <= 3) return ring;

  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  const toleranceSq = tolerance * tolerance;

  while (stack.length) {
    const [first, last] = stack.pop();
    if (last - first < 2) continue;

    const [ay, ax] = [ring[first][0], ring[first][1] * lngScale];
    const [by, bx] = [ring[last][0], ring[last][1] * lngScale];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let farthest = -1;
    let farthestSq = -1;

    for (let i = first + 1; i < last; i += 1) {
      const py = ring[i][0];
      const px = ring[i][1] * lngScale;

      let distSq;
      if (lenSq === 0) {
        distSq = (px - ax) ** 2 + (py - ay) ** 2;
      } else {
        let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        distSq = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
      }

      if (distSq > farthestSq) {
        farthestSq = distSq;
        farthest = i;
      }
    }

    if (farthestSq > toleranceSq) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }

  return ring.filter((_, i) => keep[i]);
}

/**
 * Simplify every ring under one shared tolerance, binary-searched so the total
 * vertex count lands just under `budget`. A shared tolerance means big islands
 * keep proportionally more detail than small ones.
 */
function fitToBudget(rings, budget, lngScale) {
  const total = (t) =>
    rings.reduce(
      (n, ring) => n + simplifyDouglasPeucker(ring, t, lngScale).length,
      0,
    );

  if (total(0) <= budget) return rings.map((r) => r.slice());

  let low = 0;
  let high = 0.05;
  while (total(high) > budget) high *= 2;

  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (total(mid) > budget) low = mid;
    else high = mid;
  }

  return rings.map((ring) => simplifyDouglasPeucker(ring, high, lngScale));
}

function extentDeg(rings) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const ring of rings) {
    for (const [lat, lng] of ring) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }

  return Math.max(maxLat - minLat, maxLng - minLng);
}

/** Looser simplification for city-states and other sub-degree territories. */
function simplificationParams(extent) {
  if (extent < 0.6) {
    return {
      minDistance: Math.max(extent * 0.012, 0.0015),
      maxPoints: 1200,
      minAreaRatio: 0.005,
    };
  }

  if (extent < 2.5) {
    return {
      minDistance: Math.max(extent * 0.025, 0.01),
      maxPoints: 700,
      minAreaRatio: 0.015,
    };
  }

  return DEFAULT_SIMPLIFY;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Overpass rejects the default Node user agent and rate-limits bursts. */
async function overpass(query) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt) await sleep(4000 * attempt);

    const response = await fetch(
      `${OVERPASS_URL}?data=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "house-moldovan-shape-extract/1.0",
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) continue;

    // Overpass reports mid-stream errors as HTML with a 200 status.
    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch {
      /* retry */
    }
  }
  throw new Error("Overpass request failed after 6 attempts");
}

const nodeKey = (point) => `${point[0].toFixed(7)},${point[1].toFixed(7)}`;

/**
 * OSM stores coastline as unordered, arbitrarily-directed ways. Walk them into
 * the longest chains possible; a chain that meets itself is a finished island.
 */
function stitchChains(ways) {
  const pending = ways
    .filter((way) => way.length >= 2)
    .map((way) => way.slice());
  const chains = [];

  while (pending.length) {
    let chain = pending.pop();

    let extended = true;
    while (extended && nodeKey(chain[0]) !== nodeKey(chain[chain.length - 1])) {
      extended = false;
      const head = nodeKey(chain[0]);
      const tail = nodeKey(chain[chain.length - 1]);

      for (let i = 0; i < pending.length; i += 1) {
        const way = pending[i];
        const wayHead = nodeKey(way[0]);
        const wayTail = nodeKey(way[way.length - 1]);

        if (wayHead === tail) chain = chain.concat(way.slice(1));
        else if (wayTail === tail)
          chain = chain.concat(way.slice(0, -1).reverse());
        else if (wayTail === head) chain = way.slice(0, -1).concat(chain);
        else if (wayHead === head) chain = way.slice(1).reverse().concat(chain);
        else continue;

        pending.splice(i, 1);
        extended = true;
        break;
      }
    }

    chains.push(chain);
  }

  return chains;
}

const isClosed = (chain) =>
  nodeKey(chain[0]) === nodeKey(chain[chain.length - 1]);

/**
 * Close an open coastline chain. Chains whose ends nearly meet are just snapped
 * shut; a chain broken by a land border (Hong Kong's with Shenzhen) is bridged
 * with the matching stretch of the administrative boundary.
 */
function closeChain(chain, borderChains) {
  const head = chain[0];
  const tail = chain[chain.length - 1];

  if (dist(head, tail) <= OSM_SNAP_TOLERANCE) return chain.slice(0, -1);

  for (const border of borderChains) {
    const borderHead = border[0];
    const borderTail = border[border.length - 1];

    if (
      dist(tail, borderHead) <= OSM_SNAP_TOLERANCE &&
      dist(head, borderTail) <= OSM_SNAP_TOLERANCE
    ) {
      return chain.concat(border.slice(1, -1));
    }
    if (
      dist(tail, borderTail) <= OSM_SNAP_TOLERANCE &&
      dist(head, borderHead) <= OSM_SNAP_TOLERANCE
    ) {
      return chain.concat(border.slice(1, -1).reverse());
    }
  }

  return null;
}

/** Trace a territory from OSM coastline instead of Natural Earth. */
async function osmCoastlineRings({ relation, name }) {
  const coastlineData = await overpass(
    `[out:json][timeout:240];
rel(${relation}); map_to_area -> .territory;
way["natural"="coastline"](area.territory);
out geom;`,
  );

  const coastlineWays = coastlineData.elements
    .filter((element) => element.type === "way" && element.geometry)
    .map((element) => element.geometry.map((node) => [node.lat, node.lon]));

  if (!coastlineWays.length) {
    throw new Error(`No OSM coastline found for ${name}`);
  }

  await sleep(2000);

  // Land borders come from the relation itself, minus its maritime segments.
  const boundaryData = await overpass(
    `[out:json][timeout:240];rel(${relation});way(r);out tags geom;`,
  );
  const borderChains = stitchChains(
    boundaryData.elements
      .filter(
        (element) =>
          element.type === "way" &&
          element.geometry &&
          element.tags?.maritime !== "yes",
      )
      .map((element) => element.geometry.map((node) => [node.lat, node.lon])),
  ).filter((chain) => !isClosed(chain));

  const rings = [];
  for (const chain of stitchChains(coastlineWays)) {
    if (isClosed(chain)) {
      rings.push(chain.slice(0, -1));
      continue;
    }
    const closed = closeChain(chain, borderChains);
    if (closed) rings.push(closed);
    else
      console.warn(`  dropped unclosed coastline chain (${chain.length} pts)`);
  }

  const areas = rings.map(ringArea);
  const minArea = Math.max(...areas) * OSM_MIN_AREA_RATIO;
  const kept = rings
    .filter((_, index) => areas[index] >= minArea)
    .sort((a, b) => ringArea(b) - ringArea(a));

  const meanLat =
    kept[0].reduce((sum, point) => sum + point[0], 0) / kept[0].length;
  const simplified = fitToBudget(
    kept,
    OSM_POINT_BUDGET,
    Math.cos((meanLat * Math.PI) / 180),
  );

  console.info(
    `  ${name}: ${coastlineWays.length} coastline ways → ${rings.length} rings, kept ${kept.length}, ${simplified.reduce((n, r) => n + r.length, 0)} pts (from ${kept.reduce((n, r) => n + r.length, 0)})`,
  );

  return simplified;
}

function outerRings(geometry) {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0]];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((poly) => poly[0])
      .sort((a, b) => ringArea(b) - ringArea(a));
  }
  throw new Error(`Unsupported geometry: ${geometry.type}`);
}

function toLeafletRings(geometry) {
  const latLngRings = outerRings(geometry).map((ring) =>
    ring.map(([lng, lat]) => [lat, lng]),
  );
  const params = simplificationParams(extentDeg(latLngRings));

  const rings = latLngRings.map((ring) => {
    let simplified = simplifyRing(ring, params.minDistance);
    simplified = downsample(simplified, params.maxPoints);
    return simplified;
  });

  const areas = rings.map(ringArea);
  const maxArea = Math.max(...areas);
  const minArea = maxArea * params.minAreaRatio;

  return rings.filter((_, index) => areas[index] >= minArea);
}

/** Keep rings whose northern extent lies in Europe (excludes e.g. French Guiana). */
function filterMetropolitanEurope(rings) {
  return rings.filter((ring) => {
    const maxLat = Math.max(...ring.map(([lat]) => lat));
    return maxLat > 30;
  });
}

const placesDir = join(import.meta.dirname, "../apps/en/src/content/places");
const outDir = join(import.meta.dirname, "../apps/en/src/data/country-shapes");

const ids = process.argv.includes("--all")
  ? readdirSync(placesDir)
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.replace(/\.md$/, ""))
  : process.argv.slice(2).filter((arg) => arg !== "--all");

if (!ids.length) {
  console.error("Usage: node scripts/extract-country-shape.mjs <country-id> …");
  console.error("       node scripts/extract-country-shape.mjs --all");
  process.exit(1);
}

const needsNaturalEarth = ids.some((id) => !OSM_COASTLINE[id]);
const geo = needsNaturalEarth
  ? await fetch(NE_URL).then((r) => r.json())
  : null;

for (const id of ids) {
  let name;
  let rings;

  if (OSM_COASTLINE[id]) {
    name = OSM_COASTLINE[id].name;
    rings = await osmCoastlineRings(OSM_COASTLINE[id]);
  } else {
    const iso = SLUG_TO_ISO[id];
    if (!iso) {
      console.warn(`Skipping ${id}: no ISO mapping`);
      continue;
    }

    const feature = geo.features.find((f) => {
      const props = f.properties;
      return (
        props.ISO_A3 === iso ||
        props.ISO_A3_EH === iso ||
        props.ADM0_A3 === iso ||
        props.GU_A3 === iso
      );
    });
    if (!feature) {
      console.warn(`Skipping ${id}: no Natural Earth feature for ${iso}`);
      continue;
    }

    name = feature.properties.NAME;
    rings = toLeafletRings(feature.geometry);
    if (METROPOLITAN_EUROPE_ONLY.has(id)) {
      rings = filterMetropolitanEurope(rings);
    }
  }

  const shape = { id, name, rings };
  const path = join(outDir, `${id}.json`);
  writeFileSync(path, `${JSON.stringify(shape)}\n`);
  console.log(
    `Wrote ${path} (${shape.rings.length} ring(s), ${shape.rings.reduce((n, r) => n + r.length, 0)} points)`,
  );
}
