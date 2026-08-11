import type { Accent } from "@shared/lib/accent";
import { accentHex } from "@shared/lib/accent";

/** Hike difficulty from content schema. */
export type HikeDifficulty = "usor" | "mediu" | "dificil" | "tehnic";

/** Difficulty → shared chapter accent tokens (jade / saffron / terracotta). */
export const DIFFICULTY_ACCENT: Record<HikeDifficulty, Accent> = {
  usor: "jade",
  mediu: "saffron",
  dificil: "terracotta",
  tehnic: "terracotta",
};

export const accentForDifficulty = (d: HikeDifficulty): Accent =>
  DIFFICULTY_ACCENT[d];

export const accentHexForDifficulty = (d: HikeDifficulty): string =>
  accentHex(DIFFICULTY_ACCENT[d]);

export const isTehnic = (d: HikeDifficulty): boolean => d === "tehnic";
