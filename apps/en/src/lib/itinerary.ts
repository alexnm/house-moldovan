import type { ResolvedLocation } from "~/lib/locations";

/** Ordered location names for the hero byline (each name once, in order of first appearance). */
export function heroRouteFromLocations(
  locations: readonly ResolvedLocation[],
): string {
  const seen = new Set<string>();
  const seq: string[] = [];
  for (const loc of locations) {
    if (seen.has(loc.qualifiedId)) continue;
    seen.add(loc.qualifiedId);
    seq.push(loc.name);
  }
  return seq.join(" → ");
}
