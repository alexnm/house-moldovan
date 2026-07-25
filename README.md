# Travel blog

A static, content-driven travel blog: Astro 6 + Tailwind v4, photo-led and lush.

- **Main site (English)** at `/` — four regions: South America, Asia, Middle East, Europe. Three article types: stories, spotlights and itineraries.
- **Romanian micro-site** at `/ro/*` — a separate hiking site (Pe creastă) with its own schema (`hike`), Carpathian palette, and Romanian copy.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm check        # astro check + eslint + prettier --check
pnpm build        # static output to ./dist
pnpm preview
```

## Content

Authoring lives under `src/content/`:

- `places/*.md` — destinations referenced by EN articles (region, flag).
- `trails/*.md` — Romanian mountain ranges referenced by hikes (name, optional accent, summary).
- `stories/*.mdx` — long-form place guides (prose, destination type, optional gallery).
- `spotlights/*.mdx` — photo-led place showcases (short intro + `photos[]` with caption, tagline).
- `itineraries/*.mdx` — multi-day EN itineraries with a day index.
- `hikes/*.mdx` — Romanian hikes with `range`, GPX path, distance, elevation, difficulty, waymark.

Hero images are `image()`-validated; story gallery and spotlight `photos[]` use the same `image()` helper.

GPX tracks live in `public/gpx/`. They are parsed at build time for distance, elevation change, and the SVG elevation profile.

## Design tokens

All in `src/styles/app.css` under `@theme`. Region/range accents are exposed both as semantic tokens (`--color-region-asia`, `--color-range-fagaras`, …) and as a per-page `--accent` set by layouts.

## Deploy

`pnpm build` produces a fully static `dist/`. The bundled GitHub Actions workflow deploys to Cloudflare Pages with `wrangler pages deploy`. Vercel and Netlify will accept the same `dist/` without changes.

## Pinned versions

See `package.json`. Notable: Astro 6.1.9, Tailwind 4.2.4 via `@tailwindcss/vite`, TypeScript 5.9.
