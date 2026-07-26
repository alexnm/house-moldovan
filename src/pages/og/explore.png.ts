import type { APIRoute } from "astro";
import exploreHero from "~/assets/peru/machu-picchu.jpg";
import { en } from "~/i18n/en";
import { accentHex } from "~/lib/accent";
import { renderOg } from "~/lib/og";
import { loadOgBackground } from "~/lib/ogBackground";
import { ogPngResponse } from "~/lib/ogResponse";

export const GET: APIRoute = async () => {
  const background = await loadOgBackground(exploreHero);

  const png = await renderOg({
    title: en.explore.title,
    accent: accentHex("cobalt"),
    background,
  });
  return ogPngResponse(png);
};
