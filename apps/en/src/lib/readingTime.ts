/** Words a reader gets through per minute; a common estimate for prose. */
const WORDS_PER_MINUTE = 220;

/**
 * Estimated minutes to read an MDX body. Imports, JSX tags and their
 * attributes are dropped, but photo captions count since people read them.
 */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const captions = Array.from(body.matchAll(/caption="([^"]*)"/g), (m) => m[1]);
  const text = body
    .replace(/^(import|export)\s.*$/gm, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]+/g, " ");
  const words = [text, ...captions].join(" ").split(/\s+/).filter(Boolean);
  return Math.max(1, Math.round(words.length / WORDS_PER_MINUTE));
}
