import type { AnyEnArticle } from "~/lib/content";

/** Ordered, unique location ids for map pins and hero defaults. */
export function articleLocationIds(article: AnyEnArticle): string[] {
  if (article.kind === "itinerary") {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const day of article.data.days) {
      for (const id of day.locations) {
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  }
  return article.data.locations;
}
