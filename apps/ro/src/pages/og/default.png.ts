import type { APIRoute } from "astro";
import { ro } from "~/i18n/ro";
import { accentHex } from "@shared/lib/accent";
import { renderOg } from "@shared/lib/og";
import { getRange } from "~/lib/content";
import { loadOgBackground } from "~/lib/ogBackground";
import { ogPngResponse } from "~/lib/ogResponse";
import { rangeCoverFromFrontmatterPath } from "~/lib/rangeCoverImport";

/** The share card every page falls back to: crest and wordmark centred over a
    single ridge, since the home hero's six-column atlas wall does not survive
    the crop to 1200×630. */
const HOME_RANGE = "fagaras";

export const GET: APIRoute = async () => {
  const range = await getRange(HOME_RANGE);
  const cover = rangeCoverFromFrontmatterPath(range?.data.cover);
  if (!cover) throw new Error(`No cover image for range ${HOME_RANGE}`);

  const png = await renderOg({
    variant: "ro",
    layout: "poster",
    title: ro.siteName,
    subtitle: ro.tagline,
    accent: accentHex("terracotta"),
    background: await loadOgBackground(cover),
  });
  return ogPngResponse(png);
};
