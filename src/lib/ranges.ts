/**
 * Bright yellow -> vivid green ramp for masive (RangeCard, heroes, hike accents).
 */
export const RANGE_YELLOW_GREEN_ACCENTS = [
  "oklch(0.93 0.17 97)",
  "oklch(0.86 0.16 104)",
  "oklch(0.78 0.15 114)",
  "oklch(0.75 0.16 122)",
  "oklch(0.71 0.17 132)",
  "oklch(0.66 0.175 142)",
] as const;

export const RANGE_ACCENT: Record<string, string> = {
  apuseni: RANGE_YELLOW_GREEN_ACCENTS[0],
  "piatra-craiului": RANGE_YELLOW_GREEN_ACCENTS[1],
  rodnei: RANGE_YELLOW_GREEN_ACCENTS[2],
  retezat: RANGE_YELLOW_GREEN_ACCENTS[3],
  parang: RANGE_YELLOW_GREEN_ACCENTS[4],
  fagaras: RANGE_YELLOW_GREEN_ACCENTS[5],
};

const DARK_INK = "oklch(0.22 0.04 120)";

export const RANGE_ACCENT_INK: Record<string, string> = {
  apuseni: DARK_INK,
  "piatra-craiului": DARK_INK,
  rodnei: DARK_INK,
  retezat: DARK_INK,
  parang: DARK_INK,
  fagaras: DARK_INK,
};

export const accentForRange = (slug: string, override?: string): string =>
  override ?? RANGE_ACCENT[slug] ?? RANGE_YELLOW_GREEN_ACCENTS[3];

export const inkForRange = (slug: string): string =>
  RANGE_ACCENT_INK[slug] ?? DARK_INK;

export const RANGE_ACCENT_HEX: Record<string, string> = {
  apuseni: "#ffe749",
  "piatra-craiului": "#e3d543",
  rodnei: "#b7c140",
  retezat: "#9dbd37",
  parang: "#78b637",
  fagaras: "#47ac3e",
};

export const accentHexForRange = (slug: string): string =>
  RANGE_ACCENT_HEX[slug] ?? "#9dbd37";
