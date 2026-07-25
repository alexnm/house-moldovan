import type { MarkdownHeading } from "@astrojs/markdown-remark";

/** h2 in MDX; optional nested h3 subsections. */
export type TocSection = {
  slug: string;
  text: string;
  subsections: { slug: string; text: string }[];
};

/**
 * From markdown headings, keep the first two levels in the body (`##` and `###`,
 * i.e. depth 2 and 3) and nest h3s under the preceding h2.
 */
export function buildBodyToc(
  headings: MarkdownHeading[] | undefined,
): TocSection[] {
  if (!headings?.length) return [];
  const sections: TocSection[] = [];
  for (const node of headings) {
    if (node.depth < 2 || node.depth > 3) continue;
    if (node.depth === 2) {
      sections.push({ slug: node.slug, text: node.text, subsections: [] });
    } else if (node.depth === 3) {
      if (sections.length > 0) {
        sections[sections.length - 1]!.subsections.push({
          slug: node.slug,
          text: node.text,
        });
      } else {
        sections.push({ slug: node.slug, text: node.text, subsections: [] });
      }
    }
  }
  return sections;
}
