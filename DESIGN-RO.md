---
name: Pe creastă
description: Romanian mountain hikes — shared foundation with House Moldovan, with field-guide deltas below.
parent: House Moldovan
---

# Design System: Pe creastă (RO delta)

Pe creastă (`/ro`) shares the **House Moldovan foundation** documented in [DESIGN.md](DESIGN.md): Nunito body, Bricolage UI sans, JetBrains Mono labels, shared nav/footer shell, heading scale (`.page-title`, `.section-heading`), and system-preference theme (`hm-theme`).

**Display font:** Oswald Variable — trail-sign register for hike and range titles. EN journal keeps Big Shoulders Display.

## Creative north star

**"Marcaj pe hârtie"** — a decision surface for comparing routes at the kitchen table. Photography sells the idea; difficulty, duration, distance, and gain close it.

## RO deltas (vs EN journal)

| Area             | RO behavior                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Default accent** | Saffron (nav links, focus rings, prose underlines) — shared with EN journal.                                              |
| **Display font** | Oswald (via `[lang="ro"]` → `--font-display-ro`)                                                                          |
| **Hike accents** | Difficulty-driven: ușor → jade, mediu → saffron, dificil/tehnic → terracotta. Tehnic gets a doubled accent tick on cards. |
| **Range cards**  | Cobalt drenched tiles: photo + name + summary + trail count.                                                              |
| **Card kicker**  | Uniform: `{difficulty} · {duration}` on all hike cards. Meta line: `{distance} · +{gain}`.                                |
| **Waymarks**     | SVG badge colors from hike `waymark` data only — never used as UI chrome accents.                                         |
| **Content**      | Hikes require a one-line `summary` in frontmatter (hero subtitle). Stats live in `TrailStats`.                            |
| **Logo**         | Pe creastă wordmark + crest SVG via shared `SiteLogo`.                                                                    |
| **Motion**       | Same token system as EN; parallax on featured hero is acceptable.                                                         |

## Difficulty accent map

Defined in `src/lib/difficulty.ts`:

- `usor` → `jade`
- `mediu` → `saffron`
- `dificil` → `terracotta`
- `tehnic` → `terracotta` (+ doubled tick)

## Components (RO-specific, optional)

Unused by current pages but kept for future `/ro/trasee` filter UI:

- `HikeCard`, `TrailListItem`, `TrailFeed`, `RangeSheet`, `WaymarkSignal` in `src/components/ro/`

Live pages use shared `ArticleCard`, `RangeCard`, `Hero`, `TrailStats`.

## Sister site

- RO nav/footer link to EN journal (`House Moldovan`)
- EN footer RO promo block remains commented out
