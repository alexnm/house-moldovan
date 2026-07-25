import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, getEntry } from "astro:content";
import { renderOg } from "~/lib/og";
import { accentHexForRange } from "~/lib/ranges";
import { ro } from "~/i18n/ro";

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
  const range = await getEntry("trails", entry.data.range.id);
  const accent = accentHexForRange(entry.data.range.id);
  void range;

  const meta = [
    range?.data.name,
    `${entry.data.distance} ${ro.units.km}`,
    `+${entry.data.elevationGain} ${ro.units.m}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const png = await renderOg({
    variant: "ro",
    kicker: ro.difficulty[entry.data.difficulty],
    title: entry.data.title,
    meta,
    accent,
  });
  return new Response(Buffer.from(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
