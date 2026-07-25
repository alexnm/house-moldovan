import type { APIRoute } from "astro";
import { renderOg } from "~/lib/og";

export const GET: APIRoute = async () => {
  const png = await renderOg({
    kicker: "Travel journal",
    title: "Field notes from four regions.",
    meta: "South America · Asia · Middle East · Europe",
    accent: "#3d8e6f",
  });
  return new Response(Buffer.from(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
