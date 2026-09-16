import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "../apps/en/src/data/country-shapes");

// Leaflet CRS.EPSG3857 projection, normalised to [0,1] of the world square.
const normX = (lng) => (lng + 180) / 360;
const normY = (lat) =>
  0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);

/** Mirrors Leaflet getBoundsZoom(bounds, inside=false) with zoomSnap = 1. */
function boundsZoom(b, W, H) {
  const dx = normX(b.maxLng) - normX(b.minLng);
  const dy = normY(b.minLat) - normY(b.maxLat);
  const z = Math.log2(Math.min(W / (dx * 256), H / (dy * 256)));
  return Math.floor(z);
}

/** Leaflet LatLngBounds.pad(0.12) — grows each side by 12% of the span. */
function pad(b, ratio) {
  const dLat = (b.maxLat - b.minLat) * ratio;
  const dLng = (b.maxLng - b.minLng) * ratio;
  return {
    minLat: b.minLat - dLat,
    maxLat: b.maxLat + dLat,
    minLng: b.minLng - dLng,
    maxLng: b.maxLng + dLng,
  };
}

const FIT_MAX_ZOOM = 8;
const viewports = [
  { label: "desktop 1280", W: 1216, H: 612 },
  { label: "laptop 1024", W: 968, H: 520 },
  { label: "mobile 390", W: 358, H: 448 },
];

const rows = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const shape = JSON.parse(readFileSync(join(dir, file), "utf8"));
  let b = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity,
  };
  for (const ring of shape.rings) {
    for (const [lat, lng] of ring) {
      b.minLat = Math.min(b.minLat, lat);
      b.maxLat = Math.max(b.maxLat, lat);
      b.minLng = Math.min(b.minLng, lng);
      b.maxLng = Math.max(b.maxLng, lng);
    }
  }
  const padded = pad(b, 0.12);
  const span = Math.max(b.maxLat - b.minLat, b.maxLng - b.minLng);
  const natural = viewports.map((v) => boundsZoom(padded, v.W, v.H));
  rows.push({ id: shape.id, span, natural });
}

rows.sort((a, b) => a.span - b.span);

console.log(
  "country".padEnd(22) +
    "span°".padStart(7) +
    viewports.map((v) => v.label.padStart(15)).join("") +
    "   clamped by max 8?",
);
for (const r of rows) {
  const clamped = r.natural.every((z) => z > FIT_MAX_ZOOM);
  const partial = !clamped && r.natural.some((z) => z > FIT_MAX_ZOOM);
  console.log(
    r.id.padEnd(22) +
      r.span.toFixed(2).padStart(7) +
      r.natural
        .map((z, i) => `${z}${z > FIT_MAX_ZOOM ? "*" : " "}`.padStart(15))
        .join("") +
      "   " +
      (clamped ? "YES (all)" : partial ? "partly" : "no"),
  );
}
console.log("\n* = natural fit zoom exceeds the cap of 8, so framing is clamped");
