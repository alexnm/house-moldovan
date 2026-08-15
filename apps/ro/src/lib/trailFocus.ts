/**
 * The contract between the trails map and any list that drives it.
 *
 * A list presses rows through data attributes — `data-trail-range`,
 * `data-trail-focus`, `data-trail-back` — and hears the result back as an
 * event, so the map stays the one place that decides what is focused. Kept
 * free of Astro imports: both sides ship it to the browser.
 */

export const TRAIL_FOCUS_EVENT = "trail-map:focus";

export type TrailFocusDetail = {
  /** Massif holding the map, or `null` when the whole country is in frame. */
  rangeId: string | null;
  /** Route whose card is open, always inside `rangeId`. */
  trailId: string | null;
};

declare global {
  interface DocumentEventMap {
    [TRAIL_FOCUS_EVENT]: CustomEvent<TrailFocusDetail>;
  }
}
