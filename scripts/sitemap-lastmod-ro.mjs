import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSitemapHelpers } from "./sitemap-utils.mjs";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "../apps/ro");

const { sitemapLastmod, sitemapDraftPaths } = createSitemapHelpers(appRoot, [
  { dir: "hikes", prefix: "" },
]);

export { sitemapLastmod, sitemapDraftPaths };
