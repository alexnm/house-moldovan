import message from "@tabler/icons/outline/message.svg?raw";
import map from "@tabler/icons/outline/map-2.svg?raw";
import directions from "@tabler/icons/outline/directions.svg?raw";

/** Prepare a Tabler SVG string for inline use in Astro. */
export function inlineTablerSvg(raw: string, className?: string): string {
  const classes = ["tabler-icon", className].filter(Boolean).join(" ");

  return raw
    .replace(/\s(width|height)="24"/g, "")
    .replace(/\sclass="[^"]*"/, "")
    .replace("<svg", `<svg class="${classes}" aria-hidden="true"`);
}

export const TABLER_ICONS = {
  message,
  map,
  directions,
} as const;

export type TablerIconName = keyof typeof TABLER_ICONS;

export function tablerIcon(name: TablerIconName, className?: string): string {
  return inlineTablerSvg(TABLER_ICONS[name], className);
}
