import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { en } from "~/i18n/en";
import { articleHref, articleRssDescription } from "~/lib/articles";
import { getEnFeed } from "~/lib/content";

export const GET = async (context: APIContext): Promise<Response> => {
  const feed = await getEnFeed();
  return rss({
    title: en.rss.title,
    description: en.rss.description,
    site: context.site ?? "https://example.com",
    items: feed.map((a) => ({
      title: a.data.title,
      description: articleRssDescription(a),
      link: articleHref(a),
      pubDate: a.data.published,
      categories: [a.kind],
    })),
    customData: `<language>en-gb</language>`,
  });
};
