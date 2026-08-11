import type { APIRoute, GetStaticPaths } from "astro";
import { accentHex } from "@shared/lib/accent";
import { renderOg } from "@shared/lib/og";
import { ogPngResponse } from "~/lib/ogResponse";
import { loadOgRegionBackground } from "~/lib/ogRegionBackground";
import { getAllRegions } from "~/lib/regions";

export const getStaticPaths = (async () => {
  const regions = await getAllRegions();
  return regions.map((region) => ({
    params: { slug: region.id },
    props: { region },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { region } = props as {
    region: Awaited<ReturnType<typeof getAllRegions>>[number];
  };
  const background = await loadOgRegionBackground(
    region.data.accent,
    region.data.images,
  );

  const png = await renderOg({
    title: region.data.name,
    accent: accentHex(region.data.accent),
    background,
    onAccent: true,
  });
  return ogPngResponse(png);
};
