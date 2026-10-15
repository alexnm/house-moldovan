import type { CollectionEntry } from "astro:content";
import { en } from "~/i18n/en";
import { formatBestTime, type BestTimeWindow } from "~/lib/bestTime";

export interface CountryFact {
  label: string;
  value: string;
  /** Span both columns of the facts grid. */
  wide: boolean;
}

type Facts = CollectionEntry<"places">["data"]["facts"];

/**
 * Standard country facts in their fixed display order. Region is always
 * derived from the place's region; fields left out of the frontmatter are
 * skipped. Best time comes from the place's `bestTime` windows. Returns an empty list when no fact is authored, so a country
 * without facts doesn't show a lone "Region" row.
 */
export function countryFacts(
  facts: Facts,
  regionName: string,
  bestTime: BestTimeWindow[] = [],
): CountryFact[] {
  const t = en.places.facts;
  const rows: [string, string | undefined, boolean?][] = [
    [t.population, facts.population],
    [t.capital, facts.capital],
    [t.language, facts.language],
    [t.currency, facts.currency],
    [t.timeZone, facts.timeZone],
    [t.plugType, facts.plugType],
    [t.driving, facts.driving && t.drivingSide(facts.driving)],
    [
      t.bestFor,
      facts.bestFor?.length ? facts.bestFor.join(" · ") : undefined,
      true,
    ],
    [t.bestTime, formatBestTime(bestTime), true],
  ];
  const authored = rows
    .filter((row): row is [string, string, boolean?] => Boolean(row[1]))
    .map(([label, value, wide]) => ({ label, value, wide: wide ?? false }));
  if (authored.length === 0) return [];
  return [{ label: t.region, value: regionName, wide: false }, ...authored];
}
