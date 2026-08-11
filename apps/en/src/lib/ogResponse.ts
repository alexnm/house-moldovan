export const ogPngResponse = (png: Uint8Array): Response =>
  new Response(Buffer.from(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
