# Page Builder — Block Grid Layout & Resize Design

**Date:** 2026-06-14
**Status:** Approved (design)
**Builds on:** Plan A (data-driven guest page) + Plan B (3-pane builder UI), both merged on `feat/page-builder-ui`.

## Problem

The builder currently stacks blocks in a single vertical column. Hosts want to:

1. Place blocks **side by side**, not only top-to-bottom.
2. **Resize each block** (width and height) by dragging, like resizing a window.
3. Have block contents **inert during editing** — clicking a block selects it instead of triggering its links/buttons (avoids opening tabs / dialing while editing). *(Already shipped: `pointer-events-none` wrapper around `BlockRenderer` in `Preview.tsx`.)*

Constraint that drives the whole design: **guests open the page on phones** (narrow, ~360px). A free 2D pixel grid does not map onto a phone. The host's intent: *small blocks (buttons) may stay side by side on mobile; large blocks (cards) stack.* So layout must be **responsive by intrinsic minimum width**, not absolute coordinates.

## Approach (chosen: A — flex-wrap + per-block width)

Each block carries a **column span** (1–12 of a 12-column grid). Blocks flow in a `flex flex-wrap` row that breaks automatically. Each block type has an intrinsic **min-width**; combined with flex-wrap this makes the layout responsive *for free*:

- Desktop: a block at span 6 takes ~half the row → two sit side by side.
- Phone: if the block's min-width can't fit alongside a neighbor, it wraps to a full row. Small blocks (buttons, headings) keep their min-width small enough to pair up even at ~360px; large cards (wifi, checkin, guide) have a min-width that forces them full-width on phones.

No x/y coordinates, no separate mobile layout, no react-grid-layout dependency, no DB migration.

Rejected alternatives:
- **B — absolute 2D grid (react-grid-layout):** true window-like x/y/w/h, but heavy dependency, requires a separate mobile layout (breaks "responsive automatically"), large schema and guest-render complexity.
- **C — explicit rows:** section becomes a list of rows each holding blocks; more schema nesting and more builder UI for no extra capability over A.

## Data Model

Add an optional `layout` to the shared block `base` in `apps/web/lib/blocks/schema.ts`, so every block in the discriminated union gets it:

```ts
export const blockLayout = z.object({
  width: z.number().int().min(1).max(12).default(12), // column span of a 12-col grid
  height: z.number().int().positive().optional(),     // explicit px height (desktop only)
}).default({ width: 12 })

const base = { id: z.string().min(1), layout: blockLayout }
```

- `width` default `12` → existing blocks render full-width. **No DB migration**: `resolvePageContent` already re-parses through the schema, so missing `layout` fills with the default on read.
- `height` is optional. When set it applies a fixed box height on desktop with internal scroll if content overflows. On mobile it is ignored (see Responsive rules).
- The `min(1)`/`max(12)` and existing `sections.min(1)` invariants stay. API validation (`update-schema.ts`) inherits the new field automatically since it reuses `pageContentSchema`.

## Per-type minimum width

Add a size hint to `BLOCK_META` in `apps/web/lib/blocks/fields.ts`:

```ts
minW: 'sm' | 'lg'   // sm ≈ 140px (can pair on phones), lg ≈ 300px (full-width on phones)
```

- `sm`: heading, text, button, divider, whatsapp, map, image.
- `lg`: hero, wifi, checkin, checkout, rules, guide, emergency.

(The exact px for `sm`/`lg` live in one shared constant, not scattered.)

## Shared render helper

A single helper used by **both** the guest page (`GuestSite.tsx` `SectionView`) and the builder (`Preview.tsx`), so preview and live output match:

```ts
// apps/web/lib/blocks/layout.ts
export const MIN_W_PX = { sm: 140, lg: 300 } as const
export function blockFlexStyle(layout, type): React.CSSProperties
// → { flexBasis: `${width/12*100}%`, minWidth: MIN_W_PX[meta.minW], flexGrow: 0, height? }
```

- Container becomes `flex flex-wrap items-start gap-6` (replaces the current `flex flex-col gap-8`).
- Each block wrapper gets `style={blockFlexStyle(...)}` plus `box-border`.
- Height: applied via inline `height` + Tailwind `max-md:!h-auto` + `overflow-auto` so the fixed box only exists on `md+`; phones always use content height.

## Builder resize UX

In `Preview.tsx` each selected block shows drag handles:

- **Right edge** → width. On drag, compute the pointer's fraction of the container width, snap to nearest `1..12`, call `setBlockLayout(id, { width })`.
- **Bottom edge** → height in px (`setBlockLayout(id, { height })`).
- **Bottom-right corner** → both.

Handles are only rendered for the selected block, sit above the content (`z-10`), and `stopPropagation` so they don't trigger select or dnd. Resizing uses native pointer events (`onPointerDown` + `window` move/up listeners), independent of @dnd-kit.

New store action in `store.ts`:

```ts
setBlockLayout: (id: string, patch: Partial<{ width: number; height: number }>) => void
```

It merges into the block's `layout`, goes through the existing `commit` wrapper (history/undo + dirty), and therefore autosaves like any other edit.

## Drag-and-drop

Reordering now happens in a wrapping 2D flow, so swap the sortable strategy from `verticalListSortingStrategy` to `rectSortingStrategy` in `Preview.tsx`. Drag-to-add from the palette and the `preview-dropzone` droppable are unchanged. Cross-section drag remains out of scope.

## Responsive rules (summary)

| Context | Width | Height |
|---|---|---|
| Builder preview (desktop) | span/12 of frame, min-width per type | explicit px if set, else auto |
| Guest on desktop (`md+`) | span/12, min-width per type | explicit px if set, else auto |
| Guest on phone (`< md`) | wraps to full row when min-width can't pair | always auto (`max-md:!h-auto`) |

## Components touched

| File | Change |
|---|---|
| `lib/blocks/schema.ts` | add `blockLayout` to `base` |
| `lib/blocks/fields.ts` | add `minW` to `BLOCK_META` |
| `lib/blocks/layout.ts` (new) | `MIN_W_PX`, `blockFlexStyle` helper |
| `lib/blocks/defaults.ts` | `createBlock` sets `layout: { width: 12 }` |
| `app/(app)/app/[id]/edit/_builder/store.ts` | `setBlockLayout` action |
| `app/(app)/app/[id]/edit/_builder/Preview.tsx` | flex-wrap container, `rectSortingStrategy`, resize handles |
| `app/[slug]/_components/GuestSite.tsx` | `SectionView` flex-wrap + `blockFlexStyle` |

## Testing

- Schema: a block parsed without `layout` defaults to `{ width: 12 }`; `width` out of 1–12 rejected.
- `defaults.test.ts`: `createBlock` output has `layout.width === 12` and still schema-valid.
- Store: `setBlockLayout` merges width/height, marks dirty, is undoable.
- Helper: `blockFlexStyle` maps span 6 → `flexBasis: '50%'`, applies the type's min-width, includes `height` only when set.
- Resize pointer math: a pure `spanFromFraction(px, containerPx)` helper snaps to 1–12 (unit-tested without pointer simulation, mirroring the `reorder` approach).

## Out of scope (v1)

- Fixed height on mobile (always auto).
- Dragging a block between sections (still delete + re-add).
- Free pixel x/y positioning (we use ordered flow + span).
- Per-breakpoint manual layouts.
