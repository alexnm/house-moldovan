import message from "@tabler/icons/outline/message.svg?raw";
import map from "@tabler/icons/outline/map-2.svg?raw";
import directions from "@tabler/icons/outline/directions.svg?raw";
import car from "@tabler/icons/outline/car.svg?raw";
import bus from "@tabler/icons/outline/bus.svg?raw";
import train from "@tabler/icons/outline/train.svg?raw";
import ferry from "@tabler/icons/outline/ferry.svg?raw";
import plane from "@tabler/icons/outline/plane.svg?raw";

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
  car,
  bus,
  train,
  ferry,
  plane,
} as const;

export type TablerIconName = keyof typeof TABLER_ICONS;

export function tablerIcon(name: TablerIconName, className?: string): string {
  return inlineTablerSvg(TABLER_ICONS[name], className);
}

/** Path data from a Tabler icon, so it can be drawn inside another SVG. */
export function tablerIconPaths(name: TablerIconName): string[] {
  return [...TABLER_ICONS[name].matchAll(/\bd="([^"]+)"/g)]
    .map((match) => match[1]!)
    .filter((d) => d !== "M0 0h24v24H0z");
}
