# Modular Guest-Page Builder — Design

**Date:** 2026-06-14
**Status:** Approved (brainstorm), pending implementation plan
**Scope:** v1 of the client-facing welcome-page builder that replaces the current hardcoded guest site with a data-driven, drag-and-drop block system.

## Problem

Today every guest landing page (`apps/web/app/[slug]`) renders a fixed set of hardcoded React sections (`Apartment`, `CheckIn`, `Rules`, `LocalGuide`, `CheckOut`, `Emergency`, `Home`). Page content is not stored — the `pages` table holds only `title`, `subtitle`, `theme`, `whatsapp`. Clients cannot personalize anything.

We want clients to build their own welcome page by dragging content blocks into a live preview and editing them in place — a focused, mobile-safe page builder rather than a long form.

## Goals

- Clients assemble a page from modular **blocks** dragged from a palette.
- Editing happens on a **live phone preview**, with structured fields in an inspector.
- Pages stay **mobile-correct** automatically (guests open them on phones).
- The **same block components** render both the builder preview and the public guest page.
- Existing pages keep working (backfilled with default content).

## Non-Goals (v1)

- Image upload (v1 accepts pasted image URLs only; object storage deferred).
- Free-canvas / absolute positioning (vertical block stack only).
- Multi-column or nested layout blocks.
- Navigation styles beyond button-nav and one-page scroll.
- Persisted undo history, versioning, or real-time collaboration (in-session undo only).
- Per-block style overrides beyond each block's own fields + the existing theme system.

## Key Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Editing paradigm | **Block stack** (Notion/Google-Sites style), not free canvas — reflows to any screen |
| 2 | Navigation styles (v1) | **Button-nav** (persistent bar, never disappears) + **one-page scroll**; dropdown/tab-bar deferred |
| 3 | Block library (v1) | All "core" blocks (see catalog) — everything the current site does, made modular |
| 4 | Persistence | **Single `content jsonb` column** on `pages`, validated by a shared Zod schema |
| 5 | Builder layout | **3-pane**: palette + live preview + inspector |
| 6 | Images | Pasted URL only (no upload in v1) |

## Data Model

### Page content tree

A page's content is one JSON document:

```
PageContent {
  nav: 'buttons' | 'onepage'
  sections: Section[]
}

Section {
  id: string            // nanoid, stable for reorder + nav anchors
  title: string         // shown in nav (e.g. "Wi-Fi", "Check-in")
  icon: string          // lucide icon name, used by button-nav
  blocks: Block[]
}

Block =
  | { id, type: 'heading',   props: { text, level } }
  | { id, type: 'text',      props: { html } }
  | { id, type: 'image',     props: { url, alt, caption? } }
  | { id, type: 'button',    props: { label, href, kind } }   // kind: link|tel|whatsapp|map
  | { id, type: 'divider',   props: { variant } }              // line | spacer
  | { id, type: 'wifi',      props: { ssid, password } }
  | { id, type: 'checkin',   props: { time, address, accessCode?, instructions } }
  | { id, type: 'checkout',  props: { time, items: string[] } }
  | { id, type: 'rules',     props: { items: { icon, label }[] } }
  | { id, type: 'guide',     props: { places: { name, blurb, distance?, mapUrl? }[] } }
  | { id, type: 'emergency', props: { contacts: { label, phone }[] } }
  | { id, type: 'hero',      props: { imageUrl?, greeting, propertyName } }
  | { id, type: 'whatsapp',  props: { number, message? } }
  | { id, type: 'map',       props: { query, label? } }
```

Each block is a Zod discriminated union on `type`, defined once in `packages/types` and imported by:
- the builder inspector (field rendering + validation),
- the API route (save validation),
- the renderer (typed props).

A `PageContent` Zod schema wraps the whole tree. Unknown block types fail validation on save.

### Database change

Add a nullable `content jsonb` column to `pages`. New Drizzle migration (additive, reversible). The existing `theme`, `title`, `subtitle`, `whatsapp` columns stay (theme still drives the design system; `title` still names the page).

**Backfill:** a seed/migration step populates `content` for existing rows with the "Apê completo" default template tree so no published page renders empty.

## Architecture

### Shared block renderers

A single `BlockRenderer` component walks `Section[] / Block[]` and dispatches each block to its render component (`<WifiBlock>`, `<CheckInBlock>`, …). These render components live in a shared location (e.g. `apps/web/app/[slug]/_components/blocks/` or a shared package) and are imported by **both**:

- the **public guest page** (`[slug]`, SSR/ISR, renders `status='published'` content),
- the **builder preview** (renders the in-editor draft content).

This guarantees the preview is pixel-identical to the published page. The current 7 hardcoded sections are rebuilt **once** as these block renderers; `GuestSite.tsx` is refactored from a `switch` over fixed sections to a `BlockRenderer` over data.

### Navigation rendering

`GuestSite` reads `content.nav`:
- `buttons` — persistent nav bar (top or bottom) always visible; tapping a section swaps the visible section in place. No forced return-to-home; every section is one tap away (fixes the current UX complaint).
- `onepage` — all sections rendered stacked; sticky nav smooth-scrolls to section anchors.

Nav style is a single enum so adding `dropdown`/`tabs` later is additive.

### Builder (3-pane)

Lives under `apps/web/app/(app)/app/` (authenticated). Three panes:

1. **Palette (left)** — categorized draggable block list (Primitives / Hospitality / Utility).
2. **Preview (center)** — live phone-frame preview using the shared `BlockRenderer`. Click a block to select; drag handles to reorder; drop zones between blocks. Text-like fields editable inline.
3. **Inspector (right)** — fields for the selected block, generated from its Zod schema (Wi-Fi SSID/password, hero greeting, guide places, etc.).

Drag-and-drop via `@dnd-kit` (accessible, React-friendly). Builder state in **Zustand** (per project frontend rules); server state via TanStack Query.

**Section management:** client can add/rename/reorder/delete sections; each section's `title` + `icon` feed the nav.

### Save / publish flow

- Builder **autosaves the draft**: debounced `PATCH /api/pages/[id]` writing the `content` tree (Zod-validated server-side).
- **Publish** flips `status` to `published` (existing `PublishToggle` + `/api/pages/[id]/publish`).
- Guest `[slug]` renders published `content`; builder preview renders the working draft.
- In-session **undo/redo** kept in Zustand history (not persisted).

## Templates

Two–three starter templates as **seed JSON in code** (not DB rows):

- **Apê completo** — hero, wifi, checkin, rules, guide, checkout, emergency.
- **Enxuto** — hero, wifi, checkin, whatsapp.
- **Em branco** — empty page, one empty "Início" section.

On page create, the client picks a template; its tree is copied into the new page's `content`. Templates also serve as the backfill source for existing rows.

## Error Handling

- Server validates `content` with the `PageContent` Zod schema on every save; invalid → `400 { error: { code: 'INVALID_CONTENT', message } }` (consistent with project error-handling rules). No partial writes.
- Renderer is defensive: an unknown/malformed block renders nothing (or a quiet placeholder in builder preview only), never throws — one bad block must not blank the whole guest page.
- Autosave failures surface a non-blocking "unsaved changes" indicator and retry on the next debounce tick; transient network errors retried with backoff.

## Testing

- **Zod schema** — each block type: valid props parse, invalid props reject (one assertion per test).
- **BlockRenderer** — given a block of type X, renders its expected user-visible output (behavior, not implementation).
- **Backfill** — a page row with null `content` resolves to the default template tree.
- **Nav** — button-nav keeps the bar present across section switches; one-page renders all sections with anchors.
- Run the specific test file after each change (per testing rules), not the full suite.

## Affected / New Code (sketch)

- `apps/web/lib/db/schema.ts` — add `content jsonb`.
- `apps/web/lib/db/migrations/` — new additive migration + backfill.
- `packages/types` — block + `PageContent` Zod schemas.
- `apps/web/app/[slug]/_components/blocks/*` — shared block renderers (rebuilt from current sections).
- `apps/web/app/[slug]/_components/GuestSite.tsx` — refactor to `BlockRenderer` + nav switch.
- `apps/web/app/(app)/app/.../builder/*` — 3-pane builder (palette, preview, inspector, dnd, store).
- `apps/web/app/api/pages/[id]/route.ts` — accept + validate `content` on PATCH.
- `apps/web/lib/templates.ts` — starter template trees.

## Open Decisions Deferred to Later Versions

- Image upload + object storage (Netlify Blobs vs Cloudinary).
- Dropdown + bottom-tab navigation styles.
- Fast-follow blocks: gallery, video, amenities grid, appliance how-to, FAQ, QR, host card.
- Multi-column layout blocks.
