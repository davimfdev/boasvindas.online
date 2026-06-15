# New Content Blocks (Callout, Accordion, Link Card, Carousel) Design

**Date:** 2026-06-15
**Status:** Approved (design)
**Builds on:** Plan A/B + block grid layout + page theming — all merged on `master`.

## Problem

The builder has 14 block types. Hosts want richer content blocks, mirroring the `apartamento-x` demo:

- **Tip balloon (callout)** — a highlighted note.
- **Accordion** — collapsible items (icon + title + summary + expandable body), like `apartamento-x`'s `ExpandableFeatureCard`.
- **Link card** — a card with a title, text, and a list of link buttons.
- **Carousel** — a horizontal photo gallery.

This is sub-project B of the styling epic. Sub-project A (theming) is merged, so new blocks inherit the page theme via existing CSS-var tokens (`gaccent`, `gsecondary`, `gbg`, `gaccent-strong`).

## Approach (chosen: purpose-built flat blocks)

Each new block is a **flat block with structured props**, following the existing block pattern (discriminated union → `defaults` → `fields` → `BlockRenderer` + a renderer component). No recursive/nested-block container — the alternative (a card that nests arbitrary blocks) was rejected as a large, risky architectural change (recursive schema/inspector/preview/dnd) for no extra end-user value here. List-shaped props (accordion items, links, images) reuse the inspector's existing `list` field kind, exactly like `rules`/`guide`.

## Data Model

Four new members added to `blockSchema` (`apps/web/lib/blocks/schema.ts`), each spreading `...base` (so they get `id` + optional `layout`):

```ts
export const calloutBlock = z.object({ ...base, type: z.literal('callout'),
  props: z.object({
    variant: z.enum(['tip', 'info', 'warning']).default('tip'),
    icon: z.string().default('Lightbulb'),
    text: z.string(),
  }) })

export const accordionBlock = z.object({ ...base, type: z.literal('accordion'),
  props: z.object({
    items: z.array(z.object({
      icon: z.string().default('Info'),
      title: z.string(),
      summary: z.string().default(''),
      body: z.string().default(''),
    })).default([]),
  }) })

export const linkcardBlock = z.object({ ...base, type: z.literal('linkcard'),
  props: z.object({
    title: z.string(),
    text: z.string().default(''),
    links: z.array(z.object({
      label: z.string(),
      href: safeHref.or(z.literal('')),
    })).default([]),
  }) })

export const carouselBlock = z.object({ ...base, type: z.literal('carousel'),
  props: z.object({
    images: z.array(z.object({
      url: optionalUrl,                 // '' tolerated; renderer skips empty
      alt: z.string().default(''),
      caption: z.string().optional(),
    })).default([]),
  }) })
```

All four are added to `blockSchema`'s `z.discriminatedUnion('type', [...])`.

**Empty-item safety:** the inspector's "Adicionar" pushes an all-`''` object into list props. `linkcard.links[].href` uses `safeHref.or(z.literal(''))` and `carousel.images[].url` uses the existing `optionalUrl` (preprocess `'' → undefined`), so adding a blank row never fails validation on save. Renderers skip links with empty `href` and images with no `url`.

## Factories

`apps/web/lib/blocks/defaults.ts`:
- `BLOCK_TYPES` gains `'callout', 'accordion', 'linkcard', 'carousel'`.
- `DEFAULT_PROPS` entries:
  - `callout: { variant: 'tip', icon: 'Lightbulb', text: 'Dica para o hóspede' }`
  - `accordion: { items: [{ icon: 'Info', title: 'Item', summary: '', body: '' }] }`
  - `linkcard: { title: 'Card', text: '', links: [{ label: 'Link', href: 'https://' }] }`
  - `carousel: { images: [{ url: 'https://placehold.co/800x500', alt: '', caption: '' }] }`

## Inspector + palette config

`apps/web/lib/blocks/fields.ts`:

`BLOCK_META` (label / group / icon / minW):
- `callout`  — Dica,     Básico, `Lightbulb`,          minW `sm`
- `accordion`— Sanfona,  Básico, `ChevronsUpDown`,     minW `lg`
- `linkcard` — Card,     Básico, `SquareStack`,        minW `lg`
- `carousel` — Carrossel,Básico, `GalleryHorizontal`,  minW `lg`

`BLOCK_FIELDS`:
- `callout`: `variant` select (Dica/Informação/Aviso), `icon` (kind `icon`), `text` textarea.
- `accordion`: `items` list — itemFields: `icon` (kind `icon`), `title` text, `summary` text, `body` textarea.
- `linkcard`: `title` text, `text` textarea, `links` list — itemFields: `label` text, `href` text.
- `carousel`: `images` list — itemFields: `url` text, `alt` text, `caption` text.

(The inspector already renders `select`, `textarea`, `icon`, and `list` kinds — no inspector changes needed.)

## Renderers

New files under `apps/web/app/[slug]/_components/blocks/`, each `if (block.type !== '<t>') return null`, registered in `BlockRenderer`'s `REGISTRY`. All use theme tokens so they inherit the page theme.

- **`CalloutBlock`** (server): a rounded box, color keyed by `variant` — `tip` → teal/`gaccent` tint, `info` → blue tint, `warning` → amber/`gsecondary` tint. `Icon name={icon}` + `text` (whitespace-pre-wrap).
- **`AccordionBlock`** (`'use client'`): maps `items`; each is a button row (Icon + title + summary + chevron) that toggles a local `isOpen` to reveal `body`. Mirrors `apartamento-x`'s `ExpandableFeatureCard` (chevron up/down, fade-in body). One open-state per item via a small child component.
- **`LinkCardBlock`** (server): card with `title` (serif), `text`, then `links` rendered as buttons (`gaccent` background) — skipping any with empty `href`; external links get `target="_blank" rel="noopener noreferrer"`.
- **`CarouselBlock`** (server): `flex gap overflow-x-auto snap-x snap-mandatory scrollbar-hide`; each image is a `snap-center` slide (`url`/`alt`, optional `caption` overlay). Images with empty `url` skipped. No autoplay/arrows in v1 (swipe/scroll only).

## Components touched

| File | Change |
|---|---|
| `lib/blocks/schema.ts` | 4 new block schemas + union members |
| `lib/blocks/defaults.ts` | `BLOCK_TYPES` + `DEFAULT_PROPS` (4) |
| `lib/blocks/fields.ts` | `BLOCK_META` + `BLOCK_FIELDS` (4) |
| `app/[slug]/_components/blocks/CalloutBlock.tsx` (new) | renderer |
| `app/[slug]/_components/blocks/AccordionBlock.tsx` (new) | renderer (client) |
| `app/[slug]/_components/blocks/LinkCardBlock.tsx` (new) | renderer |
| `app/[slug]/_components/blocks/CarouselBlock.tsx` (new) | renderer (client-safe; no state needed) |
| `app/[slug]/_components/blocks/BlockRenderer.tsx` | import + register 4 in `REGISTRY` |

## Testing

- Schema: each new block parses with valid props; a list block with one all-`''` added item (linkcard link, carousel image) still parses (empty href/url tolerated).
- `defaults.test.ts` (existing `it.each(BLOCK_TYPES)`) automatically covers the 4 new types parsing schema-valid — confirm `BLOCK_TYPES` includes them.
- `fields.test.ts` (existing `it.each`) covers meta + field-keys-exist for the 4 — confirm they pass.
- Renderers: `CalloutBlock` shows its text; `AccordionBlock` reveals `body` only after clicking the row; `LinkCardBlock` renders a link with the right `href` and omits empty-href links; `CarouselBlock` renders one `<img>` per non-empty image and skips empty-url entries.

## Out of scope (v1)

- Carousel autoplay, arrows, dots.
- A card block that nests arbitrary blocks (recursive).
- Video blocks.
- Per-item color overrides (callout uses fixed variant palette tied to theme tokens).
