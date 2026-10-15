/**
 * Best time to visit, from a place's `bestTime` windows. One function turns a
 * window into text, so the country page and the month pages read the same.
 */
import type { CollectionEntry } from "astro:content";

export type BestTimeWindow =
  CollectionEntry<"places">["data"]["bestTime"][number];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * [4, 5, 6, 9, 10] → "Apr–Jun, Sep–Oct"; [11, 12, 1, 2] → "Nov–Feb";
 * all twelve → "All year".
 */
export function formatMonths(months: number[]): string {
  const set = new Set(months);
  if (set.size === 12) return "All year";
  // Start right after a month that's not in the set, so a run that wraps the
  // new year (Nov–Feb) stays in one piece.
  let start = 1;
  while (!set.has(start) || set.has(((start + 10) % 12) + 1))
    start = (start % 12) + 1;
  const runs: [number, number][] = [];
  for (let i = 0, m = start; i < 12; i++, m = (m % 12) + 1) {
    if (!set.has(m)) continue;
    const last = runs[runs.length - 1];
    if (last && (last[1] % 12) + 1 === m) last[1] = m;
    else runs.push([m, m]);
  }
  return runs
    .map(([a, b]) =>
      a === b
        ? MONTH_NAMES[a - 1]
        : `${MONTH_NAMES[a - 1]}–${MONTH_NAMES[b - 1]}`,
    )
    .join(", ");
}

/** "Mar–Apr for sakura", or just "Mar–Apr" without a label. */
export function formatWindow(window: BestTimeWindow): string {
  const months = formatMonths(window.months);
  return window.label ? `${months} for ${window.label}` : months;
}

/**
 * Every window, one per line, for the country facts and cards.
 * Render it with `white-space: pre-line`.
 */
export function formatBestTime(windows: BestTimeWindow[]): string | undefined {
  return windows.length ? windows.map(formatWindow).join("\n") : undefined;
}

/** The windows that include a month (1–12). */
export function windowsInMonth(
  windows: BestTimeWindow[],
  month: number,
): BestTimeWindow[] {
  return windows.filter((w) => w.months.includes(month));
}

/** The windows that include a month, as text; undefined when none do. */
export function formatBestTimeInMonth(
  windows: BestTimeWindow[],
  month: number,
): string | undefined {
  return formatBestTime(windowsInMonth(windows, month));
}

/**
 * Just the labels of the windows that include a month, one per line and
 * capitalised ("Autumn leaves"); undefined when none of them has a label.
 */
export function labelsInMonth(
  windows: BestTimeWindow[],
  month: number,
): string | undefined {
  const labels = windowsInMonth(windows, month).flatMap((w) =>
    w.label ? [w.label[0]!.toUpperCase() + w.label.slice(1)] : [],
  );
  return labels.length ? labels.join("\n") : undefined;
}
