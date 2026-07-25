import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const images = [
  {
    out: "src/assets/seed/cusco-hero.jpg",
    grad: ["#3a1f0f", "#c2562a", "#f0a868"],
    label: "Cusco",
  },
  {
    out: "src/assets/seed/kyoto-hero.jpg",
    grad: ["#0f1f1a", "#1f5c47", "#7eb295"],
    label: "Kyoto",
  },
  {
    out: "src/assets/seed/japan-itinerary-hero.jpg",
    grad: ["#1a1a2a", "#3a5fab", "#a3c0e8"],
    label: "Japan",
  },
  {
    out: "src/assets/seed/fagaras-hero.jpg",
    grad: ["#0e1320", "#445a7a", "#a8b8c8"],
    label: "Fagaras",
  },
];

const make = async ({ out, grad, label }) => {
  const fullPath = join(root, out);
  await mkdir(dirname(fullPath), { recursive: true });
  const w = 2400;
  const h = 1500;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${grad[0]}"/>
        <stop offset="55%" stop-color="${grad[1]}"/>
        <stop offset="100%" stop-color="${grad[2]}"/>
      </linearGradient>
      <radialGradient id="v" cx="50%" cy="65%" r="80%">
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.6)"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect width="${w}" height="${h}" fill="url(#v)"/>
    <g opacity="0.18" fill="${grad[2]}">
      ${Array.from({ length: 9 })
        .map((_, i) => {
          const x = (i * 280 + 120) % w;
          const y = h - 120 - ((i * 53) % 200);
          const r = 60 + ((i * 13) % 80);
          return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
        })
        .join("")}
    </g>
    <g opacity="0.5">
      <path d="M0 ${h - 320} L${w * 0.18} ${h - 460} L${w * 0.32} ${h - 360} L${w * 0.55} ${h - 540} L${w * 0.72} ${h - 380} L${w * 0.88} ${h - 500} L${w} ${h - 360} L${w} ${h} L0 ${h} Z" fill="${grad[0]}"/>
    </g>
    <text x="80" y="${h - 80}" fill="rgba(255,255,255,0.18)" font-family="serif" font-size="140" font-style="italic">${label}</text>
  </svg>`;
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(fullPath);
  console.info("wrote", out);
};

for (const img of images) await make(img);
