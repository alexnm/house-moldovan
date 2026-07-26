import type { APIRoute } from "astro";
import { en } from "~/i18n/en";
import { accentHex, type Accent } from "~/lib/accent";
import {
  getFeaturedEnArticle,
  getPlace,
  primaryCountryFromArticle,
} from "~/lib/content";
import { renderOg } from "~/lib/og";
import { loadOgBackground } from "~/lib/ogBackground";
import { ogPngResponse } from "~/lib/ogResponse";
import { getRegion, regionIdFromPlace } from "~/lib/regions";

export const GET: APIRoute = async () => {
  const featured = await getFeaturedEnArticle();

  let accent: Accent = "saffron";
  let background: string | undefined;
  if (featured) {
    background = await loadOgBackground(featured.data.hero);
    const place = await getPlace(primaryCountryFromArticle(featured));
    if (place) {
      const region = await getRegion(regionIdFromPlace(place));
      accent = place.data.accent ?? region?.data.accent ?? accent;
    }
  }

  const png = await renderOg({
    title: en.journal.title,
    accent: accentHex(accent),
    background,
  });
  return ogPngResponse(png);
};
