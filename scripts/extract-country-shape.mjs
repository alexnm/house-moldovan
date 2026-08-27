/**
 * Extract simplified country outlines from Natural Earth 10m for map highlighting.
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
  belgium: "BEL",
  brazil: "BRA",
  cambodia: "KHM",
  chile: "CHL",
  france: "FRA",
  "hong-kong": "HKG",
  israel: "ISR",
  italy: "ITA",
  japan: "JPN",
  jordan: "JOR",
  malaysia: "MYS",
  peru: "PER",
  poland: "POL",
  singapore: "SGP",
  spain: "ESP",
  thailand: "THA",
  "united-arab-emirates": "ARE",
  uruguay: "URY",
  uzbekistan: "UZB",
  vietnam: "VNM",
};

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

const geo = await fetch(NE_URL).then((r) => r.json());

for (const id of ids) {
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

  const shape = {
    id,
    name: feature.properties.NAME,
    rings: toLeafletRings(feature.geometry),
  };

  const path = join(outDir, `${id}.json`);
  writeFileSync(path, `${JSON.stringify(shape)}\n`);
  console.log(
    `Wrote ${path} (${shape.rings.length} ring(s), ${shape.rings.reduce((n, r) => n + r.length, 0)} points)`,
  );
}
