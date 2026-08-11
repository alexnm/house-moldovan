import type { APIRoute } from "astro";
import homeHero from "~/assets/peru/salkantay-cover.jpg";
import { en } from "~/i18n/en";
import { accentHex } from "@shared/lib/accent";
import { renderOg } from "@shared/lib/og";
import { loadOgBackground } from "~/lib/ogBackground";
import { ogPngResponse } from "~/lib/ogResponse";

export const GET: APIRoute = async () => {
  const background = await loadOgBackground(homeHero);

  const png = await renderOg({
    kicker: en.home.kicker,
    title: "House Moldovan",
    accent: accentHex("saffron"),
    background,
    showLogo: false,
  });
  return ogPngResponse(png);
};
