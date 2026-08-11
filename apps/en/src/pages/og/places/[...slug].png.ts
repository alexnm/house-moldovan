import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { accentHex, type Accent } from "@shared/lib/accent";
import { renderOg } from "@shared/lib/og";
import { loadOgBackground } from "~/lib/ogBackground";
import { ogPngResponse } from "~/lib/ogResponse";
import { requirePlaceCoverFromFrontmatter } from "~/lib/placeCover";
import { getRegion } from "~/lib/regions";

export const getStaticPaths = (async () => {
  const places = await getCollection("places");
  return places.map((place) => ({
    params: { slug: place.id },
    props: { place },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { place } = props as {
    place: Awaited<ReturnType<typeof getCollection<"places">>>[number];
  };
  const region = await getRegion(place.data.region);
  const accentName: Accent = place.data.accent ?? region?.data.accent ?? "jade";
  const cover = requirePlaceCoverFromFrontmatter(place);
  const background = await loadOgBackground(cover);

  const png = await renderOg({
    title: place.data.name,
    accent: accentHex(accentName),
    background,
  });
  return ogPngResponse(png);
};
