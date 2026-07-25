import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const start = { lng: 24.625, lat: 45.5994 };
const summit = { lng: 24.6268, lat: 45.6052 };

const points = [];
const N = 240;
for (let i = 0; i <= N; i++) {
  const f = i / N;
  const phase = f <= 0.5 ? f * 2 : 2 - f * 2;
  const lng =
    start.lng + (summit.lng - start.lng) * phase + Math.sin(f * 18) * 0.0008;
  const lat =
    start.lat + (summit.lat - start.lat) * phase + Math.cos(f * 22) * 0.0006;
  const baseElev = 1850;
  const peakElev = 2535;
  const ele =
    f <= 0.5
      ? baseElev + (peakElev - baseElev) * (f * 2) ** 1.05
      : peakElev - (peakElev - baseElev) * ((f - 0.5) * 2) ** 1.05;
  points.push({ lng, lat, ele: Math.round(ele) });
}

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="seed" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Negoiu via Custura Saratii</name></metadata>
  <trk>
    <name>Negoiu via Custura Saratii</name>
    <trkseg>
${points
  .map(
    (p) =>
      `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><ele>${p.ele}</ele></trkpt>`,
  )
  .join("\n")}
    </trkseg>
  </trk>
</gpx>
`;

const out = join(root, "public/gpx/fagaras/negoiu-custura-saratii.gpx");
await mkdir(dirname(out), { recursive: true });
await writeFile(out, gpx, "utf8");
console.info("wrote", out);
