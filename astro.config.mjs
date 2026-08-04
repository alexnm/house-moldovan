import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import {
  sitemapLastmod,
  sitemapDraftPaths,
} from "./scripts/sitemap-lastmod.mjs";

const SITE = "https://housemoldovan.com";
const LASTMOD = sitemapLastmod();
const DRAFT_PATHS = sitemapDraftPaths();

export default defineConfig({
  site: SITE,
  output: "static",
  trailingSlash: "never",
  prefetch: {
    defaultStrategy: "hover",
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ro"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
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
          !page.includes("/dev/") &&
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
      tsconfigPaths: true,
    },
    plugins: [tailwindcss()],
    assetsInclude: ["**/*.pmtiles"],
  },
});
