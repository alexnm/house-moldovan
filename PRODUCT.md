# Product

## Register

brand

## Monorepo

This workspace contains **two separate brand surfaces**. Impeccable context lives **per app**. Do not design either site from this file alone.

| App | Domain | Context |
|-----|--------|---------|
| House Moldovan (EN travel journal) | `housemoldovan.com` | `apps/en/PRODUCT.md` + `apps/en/DESIGN.md` |
| Pe creastă (RO hiking, **working name**) | `pecreasta.ro` | `apps/ro/PRODUCT.md` + `apps/ro/DESIGN.md` |

Shared layout primitives and tokens live in `packages/shared` and duplicated `app.css` copies; each app's DESIGN.md documents how that foundation is used.

### Load context for the app you are editing

```bash
(cd apps/en && node "${IMPECCABLE_SKILL:-$HOME/.agents/skills/impeccable}/scripts/load-context.mjs")
(cd apps/ro && node "${IMPECCABLE_SKILL:-$HOME/.agents/skills/impeccable}/scripts/load-context.mjs")
```

Pick the app from the open files or task target. For `packages/shared` work, load both and prefer the app named in the task.

They share infrastructure, not identity.
