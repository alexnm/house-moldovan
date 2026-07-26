import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, getEntry } from "astro:content";
import { renderOg } from "~/lib/og";
import { accentHex } from "~/lib/accent";
import { loadOgBackground } from "~/lib/ogBackground";
import { ogPngResponse } from "~/lib/ogResponse";
import { getRegion } from "~/lib/regions";

export const getStaticPaths = (async () => {
  const all = await getCollection("stories");
  return all.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as {
    entry: Awaited<ReturnType<typeof getCollection<"stories">>>[number];
  };
  const placeEntries = await Promise.all(
    entry.data.country.map((p) => getEntry("places", p.id)),
  );
  const first = placeEntries.find((p) => p !== undefined);
  const region = first ? await getRegion(first.data.region) : undefined;
  const accent = region ? accentHex(region.data.accent) : accentHex("jade");
  const background = await loadOgBackground(entry.data.hero);

  const png = await renderOg({
    title: entry.data.title,
    accent,
    background,
  });
  return ogPngResponse(png);
};
