import sharp from "sharp";
import type { Accent } from "@shared/lib/accent";
import { accentHex } from "@shared/lib/accent";
import { regionMapSilhouette } from "~/lib/regionSilhouette";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
/** Matches `--accent-ink` on region heroes. */
const INK = "#141210";
/** Matches the hero map's land fill. */
const LAND_OPACITY = 0.17;

const solidSvg = (fill: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${fill}"/>
</svg>`;

/** Accent field with the region silhouette on the right, clear of the title. */
const regionShapeSvg = (
  fill: string,
  shape: NonNullable<ReturnType<typeof regionMapSilhouette>>,
): string => {
  const maxW = 700;
  const maxH = 560;
  const scale = Math.min(maxW / shape.width, maxH / shape.height);
  const drawnW = shape.width * scale;
  const drawnH = shape.height * scale;
  const x = OG_WIDTH - 36 - drawnW;
  const y = (OG_HEIGHT - drawnH) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${fill}"/>
  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(4)})">
    <path d="${shape.land}" fill="${INK}" fill-opacity="${LAND_OPACITY}"/>
  </g>
</svg>`;
};

export const loadOgRegionBackground = async (
  accent: Accent,
  regionId: string,
): Promise<string> => {
  const fill = accentHex(accent);
  const shape = regionMapSilhouette(regionId);
  const jpeg = await sharp(
    Buffer.from(shape ? regionShapeSvg(fill, shape) : solidSvg(fill)),
  )
    .resize(OG_WIDTH, OG_HEIGHT)
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
};
