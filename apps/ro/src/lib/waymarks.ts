/** Hiking waymark codes: type (b line, p dot, t triangle, c cross) + color (r a g = roșu albastru galben). */
export const WAYMARK_CODES = [
  "br",
  "ba",
  "bg",
  "pr",
  "pa",
  "pg",
  "tr",
  "ta",
  "tg",
  "cr",
  "ca",
  "cg",
] as const;

export type WaymarkCode = (typeof WAYMARK_CODES)[number];

const SHAPE: Record<string, "line" | "dot" | "triangle" | "cross"> = {
  b: "line",
  p: "dot",
  t: "triangle",
  c: "cross",
};

const HEX: Record<string, string> = {
  r: "#e84545",
  a: "#3a78ff",
  g: "#f4c542",
};

/** Romanian short labels for accessibility (one per code). */
export const WAYMARK_LABEL_RO: Record<WaymarkCode, string> = {
  br: "Bandă roșie",
  ba: "Bandă albastră",
  bg: "Bandă galbenă",
  pr: "Punct roșu",
  pa: "Punct albastru",
  pg: "Punct galben",
  tr: "Triunghi roșu",
  ta: "Triunghi albastru",
  tg: "Triunghi galben",
  cr: "Cruce roșie",
  ca: "Cruce albastră",
  cg: "Cruce galbenă",
};

export function parseWaymarkCode(code: string): {
  shape: "line" | "dot" | "triangle" | "cross";
  color: string;
} | null {
  if (code.length !== 2) return null;
  const shape = SHAPE[code[0]!];
  const color = HEX[code[1]!];
  if (!shape || !color) return null;
  return { shape, color };
}

export function waymarksAriaLabel(codes: readonly WaymarkCode[]): string {
  return codes.map((c) => WAYMARK_LABEL_RO[c]).join(", ");
}
