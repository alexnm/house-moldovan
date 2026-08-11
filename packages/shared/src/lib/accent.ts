export const ACCENTS = ["jade", "saffron", "terracotta", "cobalt"] as const;

export type Accent = (typeof ACCENTS)[number];

/** Hex fallbacks for server-side OG renders (Satori cannot read CSS variables). */
export const ACCENT_HEX: Record<Accent, string> = {
  jade: "#4ebe7d",
  saffron: "#ffc946",
  terracotta: "#d9875c",
  cobalt: "#5f9abc",
};

/** CSS `var()` reference to a named palette accent in app.css. */
export function accentVar(name: Accent): string {
  return `var(--color-${name})`;
}

/** CSS `var()` for accent used as text on canvas (readable in light mode). */
export function accentInkVar(name: Accent): string {
  return `var(--color-${name}-ink)`;
}

/** Hex color for OG images and other non-CSS contexts. */
export function accentHex(name: Accent): string {
  return ACCENT_HEX[name];
}

/** Sets `--card-accent` for photo-card tints and underlines. */
export function cardAccentStyle(name: Accent): `--card-accent: ${string}` {
  return `--card-accent: ${accentVar(name)}`;
}
