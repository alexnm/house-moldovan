import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, getEntry } from "astro:content";
import { renderOg } from "~/lib/og";
import { accentHex } from "~/lib/accent";
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
  const meta = placeEntries
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => `${p.data.flag} ${p.data.name}`)
    .join(" · ");

  const png = await renderOg({
    kicker: "Story",
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
