import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { renderOg } from "~/lib/og";
import { accentHexForDifficulty } from "~/lib/difficulty";
import { loadOgBackground } from "~/lib/ogBackground";
import { ogPngResponse } from "~/lib/ogResponse";

export const getStaticPaths = (async () => {
  const all = await getCollection("hikes");
  return all.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as {
    entry: Awaited<ReturnType<typeof getCollection<"hikes">>>[number];
  };
  const accent = accentHexForDifficulty(entry.data.difficulty);
  const background = await loadOgBackground(entry.data.hero);

  const png = await renderOg({
    variant: "ro",
    title: entry.data.title,
    accent,
    background,
  });
  return ogPngResponse(png);
};
