import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, "../src/content");

/** Content collections whose `published` frontmatter maps to a public URL. */
const COLLECTIONS = [
  { dir: "stories", prefix: "/stories" },
  { dir: "spotlights", prefix: "/spotlights" },
  { dir: "itineraries", prefix: "/itineraries" },
  { dir: "hikes", prefix: "/ro" },
];

/** Extract and normalise the `published` date from a content file's frontmatter. */
function readFrontmatterField(file, field) {
  const raw = readFileSync(file, "utf8");
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return undefined;
  const match = frontmatter[1].match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  if (!match) return undefined;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function readPublished(file) {
  const value = readFrontmatterField(file, "published");
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function readDraft(file) {
  return readFrontmatterField(file, "draft") === "true";
}

/**
 * Map of URL pathname (no trailing slash) → ISO `lastmod`, built from the
 * `published` date of each content entry. Used by the sitemap `serialize` hook.
 */
export function sitemapLastmod() {
  const map = {};
  for (const { dir, prefix } of COLLECTIONS) {
    let files;
    try {
      files = readdirSync(join(contentDir, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.mdx?$/.test(file)) continue;
      const iso = readPublished(join(contentDir, dir, file));
      if (iso) map[`${prefix}/${file.replace(/\.mdx?$/, "")}`] = iso;
    }
  }
  return map;
}

/** URL pathnames (no trailing slash) for draft content entries. */
export function sitemapDraftPaths() {
  const paths = new Set();
  for (const { dir, prefix } of COLLECTIONS) {
    let files;
    try {
      files = readdirSync(join(contentDir, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.mdx?$/.test(file)) continue;
      if (!readDraft(join(contentDir, dir, file))) continue;
      paths.add(`${prefix}/${file.replace(/\.mdx?$/, "")}`);
    }
  }
  return paths;
}
