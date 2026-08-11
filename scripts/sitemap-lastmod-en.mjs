import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSitemapHelpers } from "./sitemap-utils.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "../apps/en");

const { sitemapLastmod, sitemapDraftPaths } = createSitemapHelpers(appRoot, [
  { dir: "stories", prefix: "/stories" },
  { dir: "spotlights", prefix: "/spotlights" },
  { dir: "itineraries", prefix: "/itineraries" },
]);

export { sitemapLastmod, sitemapDraftPaths };
