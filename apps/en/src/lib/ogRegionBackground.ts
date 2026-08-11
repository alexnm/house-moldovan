import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { ImageMetadata } from "astro";
import type { Accent } from "@shared/lib/accent";
import { accentHex } from "@shared/lib/accent";
import { ogImagePath } from "~/lib/ogBackground";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** Contact-sheet slots from RegionHero.astro (percent of canvas). */
const COLLAGE_SLOTS = [
  { x: 0.22, y: 0.16, w: 0.34, rotate: -6 },
  { x: 0.56, y: 0.08, w: 0.4, rotate: 4 },
  { x: 0.32, y: 0.46, w: 0.36, rotate: 7 },
  { x: 0.64, y: 0.5, w: 0.38, rotate: -5 },
] as const;

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const s = hex.replace("#", "");
  const n =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
};

/** Approximates `color-mix(in oklch, accent N%, black)`. */
const mixAccent = (hex: string, accentPct: number, alpha = 1): string => {
  const { r, g, b } = hexToRgb(hex);
  const t = accentPct / 100;
  return `rgba(${Math.round(r * t)}, ${Math.round(g * t)}, ${Math.round(b * t)}, ${alpha})`;
};

/** Matches `.region-hero__scrim` in RegionHero.astro. */
const regionScrimSvg = (accent: string): string => {
  const scrimH = Math.min(Math.round(OG_HEIGHT * 0.55), 352);
  const yTop = OG_HEIGHT - scrimH;
  const bottom = mixAccent(accent, 92);
  const mid = mixAccent(accent, 55, 0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="${OG_HEIGHT}" x2="0" y2="${yTop}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${bottom}"/>
      <stop offset="55%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#scrim)"/>
</svg>`;
};

const collageFrameLayer = async (
  filePath: string,
  slot: (typeof COLLAGE_SLOTS)[number],
): Promise<Buffer> => {
  const frameW = Math.round(OG_WIDTH * slot.w);
  const frameH = Math.round(frameW * (3 / 4));

  const rotated = await sharp(await readFile(filePath))
    .resize(frameW, frameH, { fit: "cover", position: "center" })
    .rotate(slot.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const meta = await sharp(rotated).metadata();
  const rotW = meta.width ?? frameW;
  const rotH = meta.height ?? frameH;
  let left = Math.round(OG_WIDTH * slot.x - (rotW - frameW) / 2);
  let top = Math.round(OG_HEIGHT * slot.y - (rotH - frameH) / 2);

  let input = rotated;
  const cropLeft = Math.max(0, -left);
  const cropTop = Math.max(0, -top);
  const visibleW = Math.min(rotW - cropLeft, OG_WIDTH - Math.max(0, left));
  const visibleH = Math.min(rotH - cropTop, OG_HEIGHT - Math.max(0, top));

  if (cropLeft > 0 || cropTop > 0 || visibleW < rotW || visibleH < rotH) {
    input = await sharp(rotated)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: Math.max(1, visibleW),
        height: Math.max(1, visibleH),
      })
      .png()
      .toBuffer();
    left = Math.max(0, left);
    top = Math.max(0, top);
  }

  return sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input, left, top }])
    .png()
    .toBuffer();
};

export const loadOgRegionBackground = async (
  accent: Accent,
  images: ImageMetadata[],
): Promise<string> => {
  const bg = hexToRgb(accentHex(accent));
  const photos = images.slice(0, 4);

  const base = await sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 3,
      background: bg,
    },
  })
    .png()
    .toBuffer();

  const frameLayers = await Promise.all(
    photos.map((img, i) =>
      collageFrameLayer(ogImagePath(img), COLLAGE_SLOTS[i]!),
    ),
  );

  const jpeg = await sharp(base)
    .composite([
      ...frameLayers.map((layer) => ({ input: layer, blend: "over" as const })),
      { input: Buffer.from(regionScrimSvg(accentHex(accent))), blend: "over" },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
};
