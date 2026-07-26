import { en } from "~/i18n/en";
import type { AnyEnArticle } from "~/lib/content";
export type ArticleKind = "itinerary" | "story" | "spotlight";

export function articleHref(a: AnyEnArticle): string {
  switch (a.kind) {
    case "story":
      return `/stories/${a.id}`;
    case "spotlight":
      return `/spotlights/${a.id}`;
    case "itinerary":
      return `/itineraries/${a.id}`;
  }
}

export function articleKicker(a: AnyEnArticle): string {
  switch (a.kind) {
    case "story":
      return en.article.story;
    case "spotlight":
      return en.article.spotlight;
    case "itinerary":
      return `${en.article.itinerary} · ${en.article.days(a.data.days.length)}`;
  }
}

export function articleOgPath(a: AnyEnArticle): string {
  switch (a.kind) {
    case "story":
      return `/og/stories/${a.id}.png`;
    case "spotlight":
      return `/og/spotlights/${a.id}.png`;
    case "itinerary":
      return `/og/itineraries/${a.id}.png`;
  }
}

export function articleRssDescription(a: AnyEnArticle): string {
  return a.data.summary;
}
