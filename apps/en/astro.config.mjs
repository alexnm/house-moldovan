import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  sitemapLastmod,
  sitemapDraftPaths,
} from "../../scripts/sitemap-lastmod-en.mjs";

const SITE = process.env.ASTRO_SITE ?? "https://housemoldovan.com";
const LASTMOD = sitemapLastmod();
const DRAFT_PATHS = sitemapDraftPaths();
const root = fileURLToPath(new URL(".", import.meta.url));
const sharedRoot = fileURLToPath(
  new URL("../../packages/shared/src", import.meta.url),
);

export default defineConfig({
  site: SITE,
  output: "static",
  trailingSlash: "never",
  prefetch: {
    defaultStrategy: "hover",
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, "");
        return (
          !page.includes("/og/") &&
          !page.includes("/draft/") &&
          !DRAFT_PATHS.has(path)
        );
      },
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, "");
        const lastmod = LASTMOD[path];
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],
  vite: {
    resolve: {
      alias: {
        "~": join(root, "src"),
        "@shared": sharedRoot,
      },
    },
    plugins: [tailwindcss()],
    assetsInclude: ["**/*.pmtiles"],
  },
});
