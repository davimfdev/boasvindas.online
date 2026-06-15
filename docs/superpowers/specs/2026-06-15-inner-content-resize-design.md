# Inner Content Resize (Media Fill) Design

**Date:** 2026-06-15
**Status:** Approved (design)
**Builds on:** block grid layout + theming + new blocks — all merged on `master`.

## Problem

The grid feature lets a host drag a block's height (`layout.height` px, desktop-only). But the block's *content* doesn't follow: a cover (hero) or image keeps its intrinsic height, so the resized box just gains empty space or clips. The host expects the cover/image to actually grow/shrink with the box.

Sub-project C of the styling epic. Decision: only **media blocks** fill, and the height handle is hidden on blocks where height is meaningless.

## Approach (chosen: A — renderer-aware fill)

The three media renderers (`HeroBlock`, `ImageBlock`, `CarouselBlock`) read `block.layout?.height`; when set, they stretch their media to fill the box (`h-full object-cover`). The wrapper already applies the height (from the grid feature); we only ensure the parent chain is `h-full` and the media fills. No schema change, no new props.

Rejected: (B) a generic wrapper that forces all descendants to `h-full` — breaks captions/padding/text blocks; (C) per-block object-fit/height props — overkill for v1.

**Fillable set:** `hero`, `image`, `carousel`. `map` is a link button (no media) and is excluded; text/card/utility blocks are content-driven and excluded.

## Mechanism

### 1. Shared constant

`apps/web/lib/blocks/layout.ts`:

```ts
export const FILLABLE_BLOCKS: ReadonlySet<string> = new Set(['hero', 'image', 'carousel'])
```

### 2. Height handle only where it does something (builder)

In `Preview.tsx`'s `SortableBlock`, the **bottom-edge (height)** and **corner (width+height)** handles render only when `FILLABLE_BLOCKS.has(block.type)`. The **right-edge (width)** handle stays on every block (width works for all). Non-fillable selected blocks show only the width handle.

### 3. Full-height parent chain

For media to fill, its ancestors must be `h-full`:
- **Preview:** the inner content `<div>` is already `h-full overflow-hidden` when `block.layout?.height` is set (existing). No change.
- **GuestSite `SectionView`:** currently renders `<BlockRenderer>` directly inside the height'd wrapper. Change so that when `b.layout?.height` is set, the renderer is wrapped in a `h-full` div (mirroring Preview), giving fillable renderers a full-height parent.

### 4. Media renderers fill when height is set

Each reads `const fill = !!block.layout?.height` and adds classes only when `fill`:

- **`ImageBlock`**: `<figure>` → `h-full flex flex-col` (so caption sits below); `<img>` → add `flex-1 min-h-0 h-full` (keeps `object-cover`). Without `fill`: today's natural-height layout unchanged.
- **`HeroBlock`**: root → `h-full flex flex-col justify-end` (the background image is already `absolute inset-0` and will cover the taller box; greeting/property name sink to the bottom). Without `fill`: unchanged.
- **`CarouselBlock`**: outer container → `h-full`; each `<figure>` → `h-full` replacing the fixed `h-56`; `<img>` stays `h-full object-cover` (already full-height inside the figure). Without `fill`: keep `h-56`.

Mobile note: `layout.height` is already desktop-only (`max-md:!h-auto` on the guest wrapper from the grid feature), so on phones media reverts to natural height — no fixed-height clipping on small screens. The fill classes are harmless there because the parent height is `auto`.

## Components touched

| File | Change |
|---|---|
| `lib/blocks/layout.ts` | add `FILLABLE_BLOCKS` |
| `app/(app)/app/[id]/edit/_builder/Preview.tsx` | gate height + corner handles on `FILLABLE_BLOCKS` |
| `app/[slug]/_components/GuestSite.tsx` | wrap renderer in `h-full` when `b.layout?.height` |
| `app/[slug]/_components/blocks/ImageBlock.tsx` | fill classes when height set |
| `app/[slug]/_components/blocks/HeroBlock.tsx` | fill classes when height set |
| `app/[slug]/_components/blocks/CarouselBlock.tsx` | fill classes when height set |

## Testing

- `FILLABLE_BLOCKS` contains `hero`/`image`/`carousel` and excludes `map`/`text`.
- `ImageBlock`: with `layout.height` set, the `<img>` className includes `h-full`; without it, it does not.
- `HeroBlock`: with `layout.height`, the root includes `h-full`.
- `CarouselBlock`: with `layout.height`, figures use `h-full` (no `h-56`).
- `Preview`: a selected **text** block shows no "Redimensionar altura" handle; a selected **image** block does. (The width handle is present for both.)

## Out of scope (v1)

- Filling text/card/map blocks.
- Aspect-ratio lock or image focal-point/crop positioning.
- Min/max height clamps beyond the existing 40px floor.
- Height on mobile (stays auto).
