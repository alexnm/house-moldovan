/**
 * Text fitting for passport stamps. Widths are rough estimates in SVG user
 * units (the stamp fonts aren't measurable at build time), tuned for the
 * uppercase, letter-spaced stamp lettering.
 */

/** Strip accents and case so "Perú" and "Peru" compare equal. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!;
      row[j] = Math.min(
        row[j]! + 1,
        row[j - 1]! + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length]!;
}

/**
 * The local name is worth stamping only when it reads differently from the
 * English one: another script, or more than a couple of letters apart
 * (so "España" and "Polska" show, "Perú" and "Italia" don't).
 */
export function distinctLocalName(
  english: string,
  local: string | undefined,
  /** `true` always stamps it, `false` never; unset decides by how different it is. */
  force?: boolean,
): string | undefined {
  if (!local?.trim() || force === false) return undefined;
  if (force === true) return local.trim();
  const a = normalize(english);
  const b = normalize(local);
  if (!b || a === b) return undefined;
  return levenshtein(a, b) > 2 ? local.trim() : undefined;
}

// Advances measured from Bricolage Grotesque 700 (em units), rounded.
const NARROW = /[IJijlrtf.,:;'ʻ‘’!|·-]/u;
const WIDE = /[MWmw]/u;

/** Estimated advance of one character at font size 1 (letter spacing included). */
function charWidth(char: string, spacing: number): number {
  if (char === " ") return 0.23 + spacing;
  // CJK, Hangul, kana: wide and square.
  if (/[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/u.test(char)) return 1.05;
  // Other non-Latin scripts render without our tracking.
  if (!/[\p{Script=Latin}\p{N}\p{P}\p{S}]/u.test(char)) return 0.62;
  if (NARROW.test(char)) return 0.3 + spacing;
  if (WIDE.test(char)) return 0.92 + spacing;
  const base = char.normalize("NFD")[0] ?? char;
  return (base === base.toUpperCase() ? 0.68 : 0.57) + spacing;
}

export function estimateTextWidth(
  text: string,
  fontSize: number,
  spacing = 0.28,
): number {
  let width = 0;
  for (const char of text) width += charWidth(char, spacing);
  return width * fontSize;
}

/** `textLength` to squeeze text that would overflow, otherwise undefined. */
export function fitLength(
  text: string,
  fontSize: number,
  maxWidth: number,
): number | undefined {
  return estimateTextWidth(text, fontSize) > maxWidth ? maxWidth : undefined;
}
