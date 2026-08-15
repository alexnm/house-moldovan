import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { ImageMetadata } from "astro";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** Ink cover across the whole frame: the crest and wordmark sit centred, so a
    bottom-edge hero scrim would leave them on bare photo. */
const SCRIM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="${OG_HEIGHT}" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgb(10,8,6)" stop-opacity="0.72"/>
      <stop offset="50%" stop-color="rgb(12,10,8)" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="rgb(14,12,10)" stop-opacity="0.62"/>
    </linearGradient>
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#scrim)"/>
</svg>`;

type ImageWithPath = ImageMetadata & { fsPath?: string };

export const ogImagePath = (image: ImageWithPath): string => {
  if (image.fsPath) return image.fsPath;

  const assetsMatch = image.src.match(
    /(?:^|\/)assets\/(.+\.(?:jpg|jpeg|jpe|png|JPG|JPEG|PNG|JPE))(?:\?.*)?$/,
  );
  if (assetsMatch) {
    return join(process.cwd(), "src/assets", assetsMatch[1]!);
  }

  if (image.src.startsWith("/") || image.src.startsWith(".")) {
    return image.src.startsWith("/")
      ? join(process.cwd(), image.src.slice(1))
      : join(process.cwd(), image.src);
  }

  throw new Error(
    `Cannot resolve filesystem path for OG background: ${image.src}`,
  );
};

export const loadOgBackground = async (
  image: ImageWithPath,
): Promise<string> => {
  const input = await readFile(ogImagePath(image));
  const jpeg = await sharp(input)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "center" })
    .composite([{ input: Buffer.from(SCRIM_SVG), blend: "over" }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
};
