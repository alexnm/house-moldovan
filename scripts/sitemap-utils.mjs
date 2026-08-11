import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @param {string} contentDir @param {{ dir: string; prefix: string }[]} collections */
function buildMaps(contentDir, collections) {
  const lastmod = {};
  const drafts = new Set();

  for (const { dir, prefix } of collections) {
    let files;
    try {
      files = readdirSync(join(contentDir, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.mdx?$/.test(file)) continue;
      const fullPath = join(contentDir, dir, file);
      const raw = readFileSync(fullPath, "utf8");
      const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontmatter) continue;

      const slug = file.replace(/\.mdx?$/, "");
      const path = `${prefix}/${slug}`.replace(/\/$/, "") || prefix;

      const published = frontmatter[1].match(/^published:\s*(.+)$/m);
      if (published) {
        const date = new Date(published[1].trim().replace(/^["']|["']$/g, ""));
        if (!Number.isNaN(date.getTime())) lastmod[path] = date.toISOString();
      }

      const draft = frontmatter[1].match(/^draft:\s*(.+)$/m);
      if (draft?.[1]?.trim() === "true") drafts.add(path);
    }
  }

  return { lastmod, drafts };
}

/** @param {string} appRoot @param {{ dir: string; prefix: string }[]} collections */
export function createSitemapHelpers(appRoot, collections) {
  const contentDir = join(appRoot, "src/content");
  const { lastmod, drafts } = buildMaps(contentDir, collections);

  return {
    sitemapLastmod: () => lastmod,
    sitemapDraftPaths: () => drafts,
  };
}
