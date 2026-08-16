# House Moldovan monorepo

Two static sites in one pnpm workspace:

| App                                    | Domain (placeholder) | Package   |
| -------------------------------------- | -------------------- | --------- |
| **House Moldovan** (EN travel journal) | `housemoldovan.com`  | `apps/en` |
| **Pe creastă** (RO hiking)             | `pecreste.ro`       | `apps/ro` |

Shared layout primitives, OG renderer, GPX utilities, and accent tokens live in `packages/shared`.

## Quick start

```bash
pnpm install
pnpm dev:en          # http://localhost:4321
pnpm dev:ro          # http://localhost:4322
pnpm check           # typecheck + lint + format
pnpm build:all       # both dist/ folders
```

Per-app commands: `pnpm build:en`, `pnpm build:ro`, `pnpm deploy:en`, `pnpm deploy:ro`.

## Content

- **EN** (`apps/en/src/content/`): `places`, `regions`, `stories`, `spotlights`, `itineraries`
- **RO** (`apps/ro/src/content/`): `ranges`, `hikes` — GPX in `apps/ro/public/gpx/`

## Deploy

Each app builds to its own `dist/` and deploys to a separate Cloudflare Pages project:

- EN → `house-moldovan` (`apps/en/dist`)
- RO → `pe-creaste` (`apps/ro/dist`)

Set `ASTRO_SITE` at build time to override the placeholder RO domain (`https://pecreste.ro`). See `.github/workflows/deploy.yml` for a dual-job CI template.

## Pinned versions

See workspace `package.json` files. Notable: Astro 6.1.9, Tailwind 4.2.4, TypeScript 5.9.
