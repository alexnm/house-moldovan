import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

const modules = import.meta.glob<ImageMetadata>(
  "../assets/**/*.{jpg,jpeg,jpe,jfif,jp2,png,gif,webp,avif,JPG}",
  { import: "default" },
) as Record<string, () => Promise<ImageMetadata>>;

/** Resolve an MDX `path="stories/…/photo.jpg"` to its imported image. */
export async function loadAssetImage(path: string): Promise<ImageMetadata> {
  const rel = path.replace(/^\/+/, "").replace(/^\.*assets\//, "");
  const directKey = `../assets/${rel}`;
  let loader = modules[directKey];

  if (!loader) {
    const keys = Object.keys(modules);
    const fileName = rel.includes("/") ? rel.split("/").pop()! : rel;
    const pathMatch = keys.find((k) => k.replace(/^.*assets\//, "") === rel);
    const nameMatch = keys.find((k) => k.endsWith(`/${fileName}`));
    const hit = pathMatch ?? nameMatch;
    if (hit) loader = modules[hit];
  }

  if (!loader) {
    throw new Error(
      `AssetImage: no file for "${rel}" (expected key like ${directKey}).`,
    );
  }
  return loader();
}

/** Full-screen and thumbnail sources for the photo viewer. */
export async function lightboxSources(image: ImageMetadata) {
  const [full, thumb] = await Promise.all([
    getImage({
      src: image,
      width: Math.min(image.width, 2400),
      format: "avif",
      quality: 82,
    }),
    getImage({ src: image, width: 160, format: "avif", quality: 70 }),
  ]);
  return { full: full.src, thumb: thumb.src };
}
