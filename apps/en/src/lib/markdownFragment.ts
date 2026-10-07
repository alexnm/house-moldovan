import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import type { MarkdownProcessor } from "@astrojs/markdown-remark";

let processor: MarkdownProcessor | null = null;

async function getProcessor(): Promise<MarkdownProcessor> {
  processor ??= await createMarkdownProcessor();
  return processor;
}

/** First markdown block in a place/article body (blank-line separated). */
export function firstParagraph(body: string | undefined): string {
  if (!body?.trim()) return "";
  return body.trim().split(/\n\n+/)[0]?.trim() ?? "";
}

/** Render a short markdown string with the same pipeline as content collections. */
export async function renderMarkdownFragment(markdown: string): Promise<string> {
  if (!markdown.trim()) return "";
  const { code } = await getProcessor().then((p) => p.render(markdown));
  return code;
}
