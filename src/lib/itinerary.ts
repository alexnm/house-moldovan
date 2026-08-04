/** Ordered labels for the hero byline (each label once, in order of first appearance). */
export function heroRouteFromItineraryDays(
  days: { locations: { label: string }[] }[],
): string {
  const seen = new Set<string>();
  const seq: string[] = [];
  for (const d of days) {
    for (const loc of d.locations) {
      if (seen.has(loc.label)) continue;
      seen.add(loc.label);
      seq.push(loc.label);
    }
  }
  return seq.join(" → ");
}
