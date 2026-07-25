---
name: House Moldovan
description: A film-night photographic travel journal with travel-poster type and saturated regional chapters.
colors:
  accent-sun: "oklch(0.92 0.14 98)"
  accent-sun-soft: "oklch(0.58 0.11 98)"
  accent-sun-ink: "oklch(0.22 0.04 98)"
  ink-warm: "oklch(0.96 0.012 75)"
  ink-nav: "oklch(0.9 0.014 75)"
  ink-dim: "oklch(0.8 0.012 75)"
  ink-faint: "oklch(0.7 0.014 75)"
  surface-film: "oklch(0.13 0.014 55)"
  surface-panel: "oklch(0.18 0.016 55)"
  surface-raised: "oklch(0.2 0.016 55)"
  line-soft: "oklch(0.28 0.014 55)"
  line-strong: "oklch(0.4 0.016 55)"
  region-south-america: "oklch(0.75 0.175 155)"
  region-asia: "oklch(0.9 0.19 85)"
  region-middle-east: "oklch(0.75 0.19 35)"
  region-europe: "oklch(0.7 0.15 250)"
typography:
  display:
    fontFamily: '"Big Shoulders Display Variable", "Big Shoulders Display", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2.75rem, 5.5vw + 0.5rem, 6.5rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Big Shoulders Display Variable", "Big Shoulders Display", ui-sans-serif, system-ui, sans-serif'
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
  filter-pill:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  filter-pill-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  surface-card:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.ink-warm}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  region-jump:
    backgroundColor: "{colors.region-south-america}"
    textColor: "{colors.accent-sun-ink}"
    typography: label
    rounded: "{rounded.film}"
    padding: "8px 14px"
---

# Design System: House Moldovan

## 1. Overview

**Creative North Star: "Kodachrome Expedition"**

House Moldovan reads like a film-night travel journal stamped with place names: deep warm-neutral blacks that let photography blaze, condensed travel-poster display type, and passport-style micro labels. Density is expedition-editorial, not dashboard. The UI frames images and prose; it never competes with them. Brand and region names arrive as luggage-tag signals; story titles stay readable in mixed case.

The English journal (`/`) uses a **full palette** strategy: four saturated regional chapter hues plus a global Film Sun accent for links, focus, and wayfinding. Region tiles and explore jumps can go **drenched** (solid regional fills). Article surfaces stay film-dark and photographic. The Romanian hiking portal (`/ro`) shares infrastructure but keeps Source Serif 4 display and a softer editorial voice; do not merge their visual identities.

Motion is **choreographed but respectful**: a named role system in `app.css` (`motion-reveal`, `motion-reveal-media`, `motion-parallax`, `motion-hover-*`, enter/stagger utilities) with a duration ladder (`--duration-micro` 200ms through `--duration-enter` 900ms) and shared distances (`--motion-photo-scale` 1.04, lifts, reveal offsets). Scroll timelines sit behind `@supports (animation-timeline: view())`. Easing is cinematic (exponential ease-out), never bounce or elastic. `prefers-reduced-motion` is role-based: kill ambient travel (parallax, reveal slide, hover lift/scale); keep short opacity for image load and chrome. Spacing uses a three-tier rhythm (tight / standard / chapter) via tokens; prefer `.section`, `.section-y*`, and `--grid-gap` over ad hoc margins.

This system explicitly rejects generic AI travel-blog templates, frosted-glass chrome as default, Fraunces-and-gradient cosplay, brochure tourism, influencer metric heroes, and magazine layouts that shout type where photographs should lead.

**Key Characteristics:**
- Film-night warm-neutral canvas tuned so photography pops on phone or laptop
- Photography-first heroes with light top veils and deep bottom scrims (not heavy flat overlays)
- Condensed Big Shoulders Display (uppercase for brand, sections, place names) + Bricolage UI/prose headings + Nunito body
- Passport-stamp micro labels (`.stamp` / `.micro`) in JetBrains Mono
- Region-as-chapter color system with watermark chapter numbers on home tiles
- Sharp film-frame corners (2px) on EN photo cards; tonal layering over heavy shadows
- Asymmetric rhythm grids, not uniform card templates
- Role-based cinema motion (tokenized durations/distances; pointer-only photo hover)
- WCAG 2.1 AA target: visible focus rings, informative image alt text, keyboard-accessible controls

## 2. Colors

A deep film-night warm neutral base with one global Film Sun accent and four saturated regional chapter colors. All values are authored in OKLCH in `src/styles/app.css`; EN production overrides live under `html[lang="en"]`.

### Primary
- **Film Sun** (`oklch(0.92 0.14 98)`): Global accent for prose link underlines, focus rings, selection highlight, and wayfinding on neutral UI. Pale lemon (hue ~98), lighter and greener than Temple Gold/saffron (~85) so chrome never reads as Asia. Soft companion: `oklch(0.58 0.11 98)`. Ink on sun fills: `oklch(0.22 0.04 98)`. Not a page background and not a regional chapter.

### Secondary
- **Regional chapter colors** (set via `.accent-scope` / `data-accent`):
  - **Andean Jade** (`oklch(0.75 0.175 155)`): South America
  - **Temple Gold** (`oklch(0.9 0.19 85)`): Asia
  - **Desert Ember** (`oklch(0.75 0.19 35)`): Middle East
  - **Alpine Cobalt** (`oklch(0.7 0.15 250)`): Europe

Each region derives accent ink for text on drenched tiles. Card photo washes use the regional accent as a bottom tint, not a full-bleed wash over the image.

### Neutral
- **Warm Paper** (`oklch(0.96 0.012 75)`): Primary text (`--color-ink`)
- **Nav Paper** (`oklch(0.9 0.014 75)`): Nav and footer links at rest
- **Dim Ink** (`oklch(0.8 0.012 75)`): Secondary copy, default micro labels
- **Faint Ink** (`oklch(0.7 0.014 75)`): Tertiary labels, TOC subsections
- **Film Surface** (`oklch(0.13 0.014 55)`): Page background (`--color-surface`)
- **Panel Surface** (`oklch(0.18 0.016 55)`): Raised panels, dropdowns (`--color-surface-2`)
- **Raised Surface** (`oklch(0.2 0.016 55)`): Active filter pills, selected states
- **Soft Line** (`oklch(0.28 0.014 55)`): Borders, dividers
- **Strong Line** (`oklch(0.4 0.016 55)`): Hover borders, active pill outlines

### Named Rules
**The No Pure Black Rule.** Never use `#000` or `#fff`. Neutrals carry a warm film hue (chroma ~0.012–0.016, hue ~55–75). Photo overlays use tinted darks at partial opacity, not flat hex black.

**The Chapter Color Rule.** Regional color owns region explore surfaces, drenched home tiles, and card accent washes. Film Sun owns wayfinding on neutral UI. Do not collapse regions into the global accent, and never assign a chapter hue as `--color-accent`.

**The Photography Floor Rule.** On card and hero surfaces, text sits on gradient scrims (deep bottom, lighter top), never on raw photo pixels without a read layer. Prefer bright photos; keep hero overlay light (`--hero-overlay` ~0.22 on EN).

## 3. Typography

**Display Font:** Big Shoulders Display Variable (Big Shoulders Display, system sans) — EN journal  
**Display Font (RO):** Source Serif 4 Variable — Romanian hiking portal only  
**UI / Prose Heading Font:** Bricolage Grotesque Variable  
**Body Font:** Nunito Variable (Nunito, system-ui, sans-serif)  
**Label Font:** JetBrains Mono Variable (monospace, uppercase stamp / micro labels)

**Character:** Condensed travel-poster display with a warm humanist body. Place names and brand shout like luggage tags; long-form story titles and prose headings stay mixed-case and readable. Body prose caps at **68ch** (`--container-prose`).

### Hierarchy
- **Display / Page title** (700, `clamp(2.75rem–6.5rem)`, line-height 0.9, tracking −0.04em): EN `.page-title` at brand/hero scale, mixed case. Add `.page-title--poster` (uppercase) only for the homepage brand title.
- **Headline / Section** (700, `clamp(2rem–3.25rem)`, line-height 0.94, mixed case): EN `.section-heading`. Region chapter names use `.region-name` (uppercase).
- **Title** (Bricolage 600, ~1.3rem): Prose `h3`; photo card titles use Display at `text-xl`–`text-4xl`, **mixed case** (not uppercase).
- **Body** (Nunito 400, 1.0625rem, line-height 1.72): Article prose, about copy. Max **68ch**.
- **Stamp / Micro** (JetBrains Mono 400, 0.7–0.72rem, letter-spacing 0.12em, uppercase): Kickers, nav links, meta, chapter labels (`.stamp`, `.micro`).

### Named Rules
**The Poster Owns Place Names Rule.** Uppercase condensed display is reserved for the homepage brand title and region chapter names (`.page-title--poster`, `.region-name`). Section headings, countries, and story / spotlight / itinerary titles stay mixed case.

**The Display Owns the Fold Rule.** One display-scale headline per viewport fold. Do not stack multiple poster-scale headings without a photo or section break between them.

**The Stamp Is Metadata Rule.** Uppercase mono stamps carry type, region, dates, and wayfinding. Never use stamp style for sentences or body copy.

## 4. Elevation

This system prefers **tonal layering** and **photo contrast** over shadow stacks. Depth comes from surface steps (`surface` → `surface-2` → `surface-raised`), film-frame photo edges, and gradient scrims, not floating cards everywhere.

### Shadow Vocabulary
- **Lift** (`0 12px 30px -12px oklch(0 0 0 / 0.4)`): Mobile nav dropdown panel, elevated menus.
- **Deep** (`0 30px 80px -30px oklch(0 0 0 / 0.6)`): Available but rare; not the default card treatment.

Photo cards use gradient scrims and a short accent tick (not a full-width chrome bar), not box-shadow, for separation from the page.

### Named Rules
**The Flat Page Rule.** Article prose and explore lists sit flat on the film surface. Shadow appears only when a panel detaches (dropdown, mobile menu).

**The Transform-Only Motion Rule.** Parallax, hover scale, and reveals use `transform` and `opacity`. Never animate width, height, or layout properties. Honor `prefers-reduced-motion`.

**The Role-Based Motion Rule.** Use the named classes and tokens; do not invent per-component durations or scales. Content scroll = `.motion-reveal`; cards/photos = `.motion-reveal-media`; hero image = `.motion-parallax`; photo breathe = `.motion-hover-media` on the cover shell; bordered card lift = `.motion-hover-lift`; drenched tile lift = `.motion-hover-lift-strong`. Hover motion only under `@media (hover: hover) and (pointer: fine)`. Put hover scale on the shell, not the `.cover-image` (opacity fade and transform must not share a clobbering `transition` shorthand).

## 5. Components

### Navigation
- **Style:** Fixed top bar; transparent over heroes, solid surface when scrolled (`.site-nav.is-solid`). No frosted glass as default chrome.
- **Typography:** `.micro.link-accent` for primary links; `.display` uppercase wordmark (~1.65rem).
- **Hover / Active:** Sun underline sweeps left→right via `scaleX` on `::after` (3px on EN); active adds `.is-active` and full ink.
- **Mobile:** `details/summary` menu control (`rounded-full border`); panel uses `surface-2`, `shadow-lift`, `rounded-lg`.
- **Dropdown (desktop):** `surface-2` panel; region names in regional accent color.

### Links (`.link-accent`)
- **Shape:** No pill; inline with 3px bottom padding for underline track.
- **Default:** `ink-nav` text; sun underline hidden (`scaleX(0)`).
- **Hover / Active:** `ink` text; underline full width. Transition `--duration-ui` (280ms) `--ease-cinema`.
- **Dim variant:** `.link-accent--dim` starts at `ink-dim`.

### Stamps (`.stamp` / `.micro`)
- **Style:** JetBrains Mono, uppercase, wide tracking (0.12em). Used on photos and neutral UI for metadata.
- **On photos:** No frosted pill chrome; stamp text over the scrim is enough.

### Filter Pills (Journal tabs)
- **Shape:** Fully rounded (`rounded-full`), `px-3 py-1.5`.
- **Inactive:** Transparent bg, `border-line`, `ink-dim` text.
- **Active:** `surface-raised` bg, `border-line-strong`, `ink` text.
- **Role:** `tablist` / `tab` / `tabpanel` for journal type filters.

### Photo Cards (`.article-card`, country cards)
- **Signature component.** Full-bleed image, film-frame corners (`2px` on EN), deep bottom scrim + regional tint wash.
- **Accent tick:** Short solid bar (~3rem × 1–4px) in regional accent above the title block.
- **Kicker:** `.stamp` / `.stamp-badge` top-left over the scrim.
- **Enter:** `.motion-reveal-media` on the card (or list item for country/itinerary tiles).
- **Hover:** `.motion-hover-media` on the **cover shell** (`--motion-photo-scale` 1.04, `--duration-media` 700ms). Not on the `.cover-image` img.
- **Layout:** Asymmetric `rhythm-grid` (1–3 columns, optional wide cells).

### Region Strip (home)
- **Drenched tiles:** `aspect-4/5` panels in regional accent + derived ink text.
- **Watermark:** Giant chapter number (`01`–`04`) at low opacity.
- **Type:** Uppercase condensed region name; Bricolage/sans tagline.
- **Enter:** `.motion-reveal-media` on each list item.
- **Hover:** `.motion-hover-lift-strong` (`--motion-lift-strong` 1rem) + `.motion-hover-chevron`; pointer-fine only.

### Heroes (home + article + explore + region)
- **Layout:** Full-bleed, `min-h-svh` / max viewport; `.motion-parallax` on the image layer (±8% + scale 1.08).
- **Title block:** Bottom-left aligned; stamp/kicker `animate-cinema-fade`, title `animate-cinema-rise`, summary `animate-cinema-fade motion-stagger` (120ms).
- **Overlay:** Gradient veil (deep bottom, light top), not a flat heavy dimmer.
- **Routes:** Astro `ClientRouter` with shared `transition:name` on heroes; root view-transition crossfade uses `--duration-chrome` + `--ease-cinema-slow`.

### Motion roles (system)
| Role | Class | When |
|------|-------|------|
| Content reveal | `.motion-reveal` (alias `.reveal`) | Prose, sections, hike blocks |
| Media reveal | `.motion-reveal-media` | Cards, region tiles, spotlight photos |
| Parallax | `.motion-parallax` (alias `.parallax`) | One hero image layer per page |
| Photo hover | `.motion-hover-media` | Cover shell inside `.group` |
| Tile lift | `.motion-hover-lift` / `-strong` | Bordered cards vs drenched tiles |
| Enter / stagger | `animate-cinema-*`, `.motion-stagger` | Hero title stacks only |

### Explore region jumps
- **Style:** Drenched regional stamps (`rounded-sm`), not frosted pills.
- **Section heads:** Uppercase condensed region name in regional color; sans tagline.

### Prose (`.prose-body`)
- **Headings:** Bricolage (EN), mixed case; RO uses Source Serif display.
- **Links:** Sun underline via `background-image` (3px on EN).
- **Blockquotes:** Sans italic, opening quote in sun, no side-stripe border.
- **Figures:** Slight radius (`6px`), full width.
- **Info callouts:** `.tip` / `.warning` with tinted backgrounds and SVG mask icons.

### Surface Cards
- **Shape:** `rounded-lg` (8px), full border `border-line`.
- **Background:** `surface-2`; no shadow at rest.

## 6. Do's and Don'ts

Concrete guardrails derived from PRODUCT.md and the implemented Kodachrome Expedition system.

### Do:
- **Do** let photography occupy the hero: full-bleed images with gradient read layers, not colored placeholder blocks.
- **Do** use Big Shoulders uppercase only for the homepage brand title and region names; keep section headings, countries, and story titles mixed case.
- **Do** assign regional color on explore surfaces, home chapter tiles, and card accent washes; keep Film Sun for global wayfinding on neutral UI. Never reuse a chapter hue as the global accent.
- **Do** use OKLCH tokens from `app.css`; tint every neutral toward warm film hue ~55–75.
- **Do** honor `prefers-reduced-motion` via the role-based block: no parallax/hover travel; reveals and hero enters collapse to a short fade; keep cover/LQIP and chrome opacity transitions.
- **Do** use motion tokens and role classes from `app.css`; put photo hover on the cover shell, not the fading img.
- **Do** cap prose at 68ch; use stamp/micro style only for metadata.
- **Do** write descriptive alt text on informative travel photography.

### Don't:
- **Don't** use generic AI travel-blog templates: identical card grids, frosted-glass nav as default chrome, stock-placeholder heroes, interchangeable Fraunces-and-gradient aesthetics.
- **Don't** bring back soft Fraunces editorial display on the English journal; that voice was retired for Kodachrome Expedition.
- **Don't** use side-stripe borders (`border-left` / `border-right` > 1px) on cards, TOC items, or callouts. Use spacing, weight, short accent ticks, or full borders instead.
- **Don't** treat the English journal and Romanian hiking portal as one visual product.
- **Don't** use brochure tourism patterns: superlatives, "hidden gem" filler layouts, author-less destination marketing.
- **Don't** add influencer patterns: engagement metric heroes, modal newsletter popups, engagement bait blocks.
- **Don't** do magazine cosplay without photography: oversized display type and drop caps where images should lead.
- **Don't** force uppercase on long story titles; poster case is for place and section signals.
- **Don't** use `#000`, `#fff`, gradient text (`background-clip: text`), bounce/elastic easing, or layout-property animation.
- **Don't** invent ad hoc hover scales or durations (no `scale-[1.03]` / `duration-500` one-offs); use `--motion-photo-scale` and the duration ladder.
- **Don't** wrap chrome (e.g. MetaBar) in scroll reveals; reserve `.motion-reveal*` for content and media that earn attention.
- **Don't** nest cards. One surface level per grouping.
