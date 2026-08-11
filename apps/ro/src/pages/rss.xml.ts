import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { ro } from "~/i18n/ro";
import { getHikes } from "~/lib/content";

export const GET = async (context: APIContext): Promise<Response> => {
  const hikes = await getHikes();
  return rss({
    title: ro.rss.title,
    description: ro.rss.description,
    site: context.site ?? "https://example.com",
    items: hikes.map((h) => ({
      title: h.data.title,
      description: `${ro.difficulty[h.data.difficulty]} · ${ro.units.distance(h.data.distance)} · +${ro.units.elevation(h.data.elevationGain)}`,
      pubDate: h.data.published,
      link: `/${h.id}`,
      categories: [h.data.range.id, h.data.difficulty],
    })),
    customData: `<language>ro-ro</language>`,
  });
};
