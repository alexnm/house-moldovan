/** Built cards are content-addressed by route, so they can be held forever.
    In dev the same URL is re-rendered on every edit, and `immutable` would
    keep the browser on the first version it ever saw. */
const CACHE_CONTROL = import.meta.env.DEV
  ? "no-store"
  : "public, max-age=31536000, immutable";

export const ogPngResponse = (png: Uint8Array): Response =>
  new Response(Buffer.from(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": CACHE_CONTROL,
    },
  });
