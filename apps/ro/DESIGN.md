---
name: Pe creastă
description: Romanian Carpathian hiking journal — kitchen-table route decisions with Oswald trail-sign type, massif atlas, and difficulty compare signals.
colors:
  accent-saffron: "oklch(0.88 0.2 86)"
  accent-saffron-soft: "oklch(0.58 0.11 98)"
  accent-saffron-ink: "oklch(0.22 0.04 86)"
  ink-warm: "oklch(0.96 0.012 75)"
  ink-nav: "oklch(0.9 0.014 75)"
  ink-dim: "oklch(0.8 0.012 75)"
  ink-faint: "oklch(0.7 0.014 75)"
  surface-film: "oklch(0.13 0.014 55)"
  surface-panel: "oklch(0.18 0.016 55)"
  surface-raised: "oklch(0.2 0.016 55)"
  line-soft: "oklch(0.28 0.014 55)"
  line-strong: "oklch(0.4 0.016 55)"
  difficulty-usor: "oklch(0.75 0.175 155)"
  difficulty-mediu: "oklch(0.9 0.19 85)"
  difficulty-dificil: "oklch(0.75 0.19 35)"
  range-sky: "oklch(0.7 0.14 250)"
typography:
  display:
    fontFamily: '"Oswald Variable", "Oswald", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2.75rem, 5.5vw + 0.5rem, 6.5rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Oswald Variable", "Oswald", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2rem, 1.2rem + 2vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Bricolage Grotesque Variable", "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1.3rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Nunito Variable", "Nunito", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.72
  label:
    fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace'
    fontSize: "0.7rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.12em"
rounded:
  film: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  canvas-x: "1rem"
  canvas-x-md: "1.5rem"
  tight: "0.75rem"
  group: "1rem"
  block: "1.5rem"
  section-y: "clamp(3rem, 5vw + 1.5rem, 5rem)"
  section-y-lg: "clamp(4rem, 6vw + 2rem, 7rem)"
  section-y-tight: "clamp(2rem, 3vw + 1rem, 2.5rem)"
  nav-clear: "8rem"
  hero-bottom: "clamp(3rem, 6vw + 1rem, 6rem)"
  grid-gap: "1rem"
components:
  link-accent:
    textColor: "{colors.ink-nav}"
    typography: label
    padding: "0 0 3px 0"
  link-accent-hover:
    textColor: "{colors.ink-warm}"
  stamp:
    textColor: "{colors.ink-dim}"
    typography: label
  hike-kicker:
    textColor: "{colors.ink-dim}"
    typography: label
  surface-card:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  range-tile:
    backgroundColor: "{colors.range-sky}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.sm}"
    padding: "1.25rem"
---

# Design System: Pe creastă

## 1. Overview

**Creative North Star: "Marcaj pe hârtie"**

_Pe creastă_ (working name; final name pending) is a kitchen-table decision surface for Romanian Carpathian hikes. Photography sells the idea; difficulty, duration, distance, and gain close it. Density is field-guide-editorial: scannable stats and honest notes, never AllTrails dashboard chrome.

This document covers `pecreasta.ro` (`apps/ro`). Tokens and shell patterns are shared with House Moldovan (`apps/en`), but **identity is separate**: Oswald trail-sign display, massif atlas wayfinding, difficulty as a compare signal on hike cards. Sister site: `housemoldovan.com`.

Motion reuses the same role system and duration ladder as the EN journal (`apps/ro/src/styles/app.css`). Easing stays cinematic (exponential ease-out). Honor `prefers-reduced-motion`. Parallax on the featured hero is acceptable.

This system rejects AllTrails-style dashboards, impersonal trail boilerplate, brochure tourism portals, influencer hike-reel layouts, and treating RO and EN as one visual skin.

**Key Characteristics:**

- Film-night warm-neutral canvas shared with the sister journal (tokens in `app.css`)
- Oswald Variable display (trail-sign register) via `[lang="ro"]` → `--font-display-ro`
- Massif → trail atlas (home wall + `/munti`); cobalt range tiles today
- Difficulty compare accents on hike cards (jade / saffron / terracotta); text kickers always accompany color
- Uniform hike card kicker: `{difficulty} · {duration}`; meta `{distance} · +{gain}`
- First-class GPX map, elevation profile, and waymark badges (data colors only)
- Crest wordmark via shared `SiteLogo` + `/logo-pe-creasta.svg`
- WCAG 2.1 AA target; Romanian a11y labels on waymarks

## 2. Colors

Same warm film neutrals as House Moldovan. Global chrome accent is saffron (nav underlines, focus, prose links). Chapter organization is geographic (massifs); difficulty colors are a **compare layer** on hikes, not the site's chapter palette.

### Primary

- **Saffron** (`oklch(0.88 0.2 86)` dark / `oklch(0.7 0.19 86)` light): Default accent for links, focus rings, prose underlines. Soft companion and on-accent ink as in `app.css`.

### Secondary (difficulty compare)

Set via `.accent-scope` / `data-accent` on hike cards (`apps/ro/src/lib/difficulty.ts`):

- **Jade** (`oklch(0.75 0.175 155)`): `usor`
- **Saffron** (`oklch(0.9 0.19 85)`): `mediu`
- **Terracotta** (`oklch(0.75 0.19 35)`): `dificil` and `tehnic` (`tehnic` doubles the accent tick)

### Secondary (massif / atlas)

- **Range Sky / Cobalt** (`oklch(0.7 0.14 250)`): Default drenched fill for range cards and atlas tiles.
- Per-massif tokens exist (`--color-range-fagaras`, `-retezat`, `-apuseni`, `-rodnei`, `-piatra-craiului`) for future chapter tinting; live range cards currently use range-sky.

### Neutral

Identical film neutrals to EN: Warm Paper, Nav Paper, Dim/Faint Ink, Film/Panel/Raised surfaces, Soft/Strong lines (see `apps/ro/src/styles/app.css`).

### Named Rules

**The No Pure Black Rule.** Never `#000` / `#fff`. Tint neutrals toward warm film hue ~55–75.

**The Massif Chapter Rule.** Atlas and `/munti` organize by mountain range. Do not reorganize the product around difficulty bands.

**The Difficulty Compare Rule.** Difficulty color is a scannable effort signal on hike cards and related scopes. Always pair with text (`Ușor`, `Mediu`, …). Never use difficulty hues as the global `--color-accent`.

**The Waymark Data Rule.** Waymark SVG colors come from hike frontmatter only. Never promote waymark hues into chrome, focus rings, or generic accents.

**The Photography Floor Rule.** Card and hero text sits on gradient scrims, never raw photo pixels without a read layer.

## 3. Typography

**Display Font:** Oswald Variable (trail-sign)  
**UI / Prose Heading Font:** Bricolage Grotesque Variable  
**Body Font:** Nunito Variable  
**Label Font:** JetBrains Mono Variable

**Character:** Condensed trail-sign titles with the same warm humanist body as the sister journal. Prose max **68ch**.

### Hierarchy

- **Display / Page title:** Oswald, `.page-title` (e.g. "Munți, marcaje, lumină.").
- **Headline / Section:** Oswald `.section-heading`; massif names as place signals.
- **Title:** Bricolage for prose `h2`/`h3`; hike card titles use Display at card scale, mixed case.
- **Body:** Nunito article / field notes.
- **Stamp / Micro:** JetBrains Mono uppercase for kickers, nav, stats labels.

### Named Rules

**The Trail Sign Owns Massif Names Rule.** Oswald display carries range and hike titles; do not borrow Big Shoulders from the EN journal.

**The Display Owns the Fold Rule.** One display-scale headline per viewport fold.

**The Stamp Is Metadata Rule.** Mono stamps carry difficulty, duration, distance, gain, season, wayfinding. Never stamp whole sentences.

## 4. Elevation

Tonal layering and photo contrast over shadow stacks (same vocabulary as EN: lift for menus, deep rare). Hike and range cards use scrims and accent ticks, not floating shadow cards.

### Named Rules

**The Flat Page Rule.** Prose, trail stats, and lists sit flat on the film surface.

**The Transform-Only Motion Rule.** Animate `transform` / `opacity` only. Honor `prefers-reduced-motion`.

**The Role-Based Motion Rule.** Same class/token contract as EN (`.motion-reveal`, `.motion-reveal-media`, `.motion-parallax`, `.motion-hover-*`).

## 5. Components

### Navigation

- Fixed top bar; transparent over heroes, solid when scrolled. Crest + wordmark via `SiteLogo`.
- No border and no blur: the solid state fades an opaque `--color-surface-2` panel in via `::before`, one step above the canvas and the same panel level as the footer. EN shares this shell verbatim.
- Primary links: Trasee, Munți, Despre. No EN link in nav (EN lives in footer / despre).
- Same underline / mobile `details` patterns as the shared shell.

### Range cards / Atlas

- Cobalt (range-sky) drenched tiles: photo, name, summary, trail count.
- Home atlas wall: vertical massif columns (`AtlasHero` / `AtlasVerticalCard`).
- Enter: `.motion-reveal-media`; hover lift on pointer-fine.

### Hike cards

- Photo card with difficulty accent tick (doubled for `tehnic`).
- Kicker: `{difficulty} · {duration}`. Meta: `{distance} · +{gain}`.
- Live grids use `ArticleCard` / `HikeRhythmGrid`; optional prototypes in `apps/ro/src/components/ro/` (`HikeCard`, `TrailListItem`, `TrailFeed`, `RangeSheet`, `WaymarkSignal`) for future `/trasee` filters.

### Hike page

- Hero + `TrailStats` (distance, gain, duration, difficulty, shape, season, trailhead).
- `HikeMap` + `ElevationProfile` + GPX download are first-class.
- `WaymarkBadge` row from frontmatter codes.

### Heroes

- Full-bleed where used; parallax acceptable on featured home hero.
- Title stack uses cinema enter utilities; summary is the one-line hike/range hook.

### Prose

- Bricolage headings, Nunito body, saffron link underlines.
- Tip/warning callouts with tinted backgrounds; no side-stripe borders.

### Sister site

- Footer and despre link to `https://housemoldovan.com`.
- EN→RO promo remains optional/commented on the sister app.

## 6. Do's and Don'ts

Derived from `apps/ro/PRODUCT.md` and the implemented Marcaj pe hârtie system.

### Do:

- **Do** lead with massif atlas wayfinding; place every hike inside a range.
- **Do** keep stats scannable on cards and hike pages (difficulty, duration, distance, gain).
- **Do** use Oswald for display titles; keep Bricolage / Nunito / JetBrains for UI, body, and stamps.
- **Do** pair difficulty color with Romanian text labels.
- **Do** treat GPX, map, elevation profile, and marcaje as core product.
- **Do** keep waymark colors data-bound only.
- **Do** honor `prefers-reduced-motion` and WCAG 2.1 AA.
- **Do** write personal field notes; require a one-line `summary` on every hike.

### Don't:

- **Don't** build AllTrails-style dashboards or metric hero strips.
- **Don't** ship impersonal trail boilerplate or brochure tourism copy.
- **Don't** organize the site as difficulty chapters (that is EN's region-chapter pattern, not RO).
- **Don't** use Big Shoulders Display on this site.
- **Don't** reuse waymark colors as chrome accents.
- **Don't** treat this site and House Moldovan as one visual product.
- **Don't** use side-stripe borders, gradient text, `#000`/`#fff`, bounce/elastic easing, or layout-property animation.
- **Don't** nest cards or invent ad hoc motion scales outside the token ladder.
