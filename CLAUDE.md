# Project Instructions

## Commands

```bash
# Build
pnpm build               # turbo build (all apps/packages)
pnpm --filter web build  # build only the web app

# Test
pnpm test                # run full suite
pnpm --filter web test -- path/to/file  # single test file

# Lint & Format
pnpm lint                # eslint across all packages
pnpm typecheck           # tsc --noEmit

# Dev
pnpm dev                 # start all apps (turbo dev)

# DB
pnpm drizzle-kit migrate  # run migrations
pnpm drizzle-kit studio   # open Drizzle Studio
pnpm drizzle-kit generate # generate migration from schema changes
```

## Architecture

Turborepo monorepo: `apps/web` is Next.js 15 (App Router) — handles marketing, authenticated builder, public guest landing pages (`/[slug]`), and REST API (Route Handlers). Shared packages: `packages/ui` (shadcn components), `packages/types` (Zod schemas shared between frontend and API).

- `apps/web/app/(marketing)/` — public homepage
- `apps/web/app/(app)/` — authenticated builder (requires Auth.js session)
- `apps/web/app/[slug]/` — public guest landing page (SSR/ISR)
- `apps/web/app/api/` — Route Handlers (REST)
- `apps/web/lib/db/` — Drizzle schema + queries (Neon/PostgreSQL)

## Key Decisions

- Auth tokens via Auth.js v5 session cookies — XSS-safe, no manual token management
- Single Netlify deploy for SSR + API — no separate backend server
- Drizzle ORM over Prisma — lighter, schema-first, better Neon compatibility
- Zod schemas in `packages/types` — shared between form validation and API validation

## graphify (token reduction)

Knowledge graph at `graphify-out/graph.json` — 114 nodes, **10.7x fewer tokens** than reading files.

- Before reading multiple files: run `/graphify query "your question"` first
- To trace a relationship: `/graphify path "NodeA" "NodeB"`
- After significant changes: `/graphify --update` to keep graph current
