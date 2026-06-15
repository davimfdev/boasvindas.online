# Inner Content Resize (Media Fill) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a host resizes a media block's height, the media (cover, image, carousel) fills the box; the height handle is hidden on blocks where height is meaningless.

**Architecture:** A shared `FILLABLE_BLOCKS` set lists the media block types. The builder shows the height/corner resize handles only for those types. The three media renderers read `block.layout?.height` and apply `h-full object-cover` fill classes; the guest page wraps such blocks in an `h-full` parent so the chain reaches the media. No schema change.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-06-15-inner-content-resize-design.md`. Branch: `feat/inner-resize`. Fillable set = `hero`, `image`, `carousel` (map is a link, excluded).

**Conventions:**
- Tests: `pnpm --filter web test -- <path>`; group builder/guest renders with `--no-file-parallelism`.
- `@/` = `apps/web/`. Run `pnpm typecheck` before each commit.
- Commit after each task. Ignore the `.bashrc` `$'...export'` warning.

---

## Task 1: `FILLABLE_BLOCKS` constant

**Files:**
- Modify: `apps/web/lib/blocks/layout.ts`
- Test: `apps/web/lib/blocks/__tests__/layout.test.ts` (append)

- [ ] **Step 1: Write the failing test** — append to `layout.test.ts`:

```ts
import { FILLABLE_BLOCKS } from '../layout'

describe('FILLABLE_BLOCKS', () => {
  it('includes the media blocks and excludes non-media', () => {
    expect(FILLABLE_BLOCKS.has('hero')).toBe(true)
    expect(FILLABLE_BLOCKS.has('image')).toBe(true)
    expect(FILLABLE_BLOCKS.has('carousel')).toBe(true)
    expect(FILLABLE_BLOCKS.has('map')).toBe(false)
    expect(FILLABLE_BLOCKS.has('text')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/layout.test.ts`
Expected: FAIL — `FILLABLE_BLOCKS` is not exported.

- [ ] **Step 3: Implement** — add to `apps/web/lib/blocks/layout.ts` (e.g. below `MIN_W_PX`):

```ts
// Blocks whose media should stretch to fill an explicit layout.height box.
export const FILLABLE_BLOCKS: ReadonlySet<string> = new Set(['hero', 'image', 'carousel'])
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/layout.ts apps/web/lib/blocks/__tests__/layout.test.ts
git commit -m "feat: FILLABLE_BLOCKS set (media blocks that fill on height resize)"
```

---

## Task 2: Gate the height handles in the builder

**Files:**
- Modify: `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx` (append)

- [ ] **Step 1: Write the failing test** — append to `Preview.test.tsx`:

```ts
it('hides the height handle on non-fillable blocks and shows it on media blocks', () => {
  const content: PageContent = { nav: 'buttons', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'text', props: { text: 'oi' } },
      { id: 'b2', type: 'image', props: { url: 'https://x.com/a.jpg', alt: '' } } ] } ] }

  const store1 = createBuilderStore(content)
  store1.getState().selectBlock('b1')
  const { unmount } = render(<Preview store={store1} theme="modern" whatsapp={null} />)
  expect(screen.queryByLabelText('Redimensionar altura')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Redimensionar largura')).toBeInTheDocument()
  unmount()

  const store2 = createBuilderStore(content)
  store2.getState().selectBlock('b2')
  render(<Preview store={store2} theme="modern" whatsapp={null} />)
  expect(screen.getByLabelText('Redimensionar altura')).toBeInTheDocument()
})
```

(`screen` is imported in this test file alongside `render`; if not, add it to the `@testing-library/react` import.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"`
Expected: FAIL — the height handle currently renders for every selected block.

- [ ] **Step 3: Implement** — in `Preview.tsx`:

Add the import (with the other `@/lib/blocks/layout` import):

```ts
import { blockFlexStyle, spanFromFraction, FILLABLE_BLOCKS } from '@/lib/blocks/layout'
```

(Adjust the existing import line to include `FILLABLE_BLOCKS`.)

In `SortableBlock`, compute near the top of the component body:

```ts
  const canFill = FILLABLE_BLOCKS.has(block.type)
```

Wrap only the height + corner handles in `canFill` (keep the width handle unconditional). Replace the `{isSelected && (...)}` block's inner content so it reads:

```tsx
      {isSelected && (
        <>
          <div
            role="separator"
            aria-label="Redimensionar largura"
            onPointerDown={(e) => startResize(e, { width: true })}
            className="absolute right-0 top-0 z-20 h-full w-2 cursor-ew-resize hover:bg-[#0d9488]/30"
          />
          {canFill && (
            <>
              <div
                role="separator"
                aria-label="Redimensionar altura"
                onPointerDown={(e) => startResize(e, { height: true })}
                className="absolute bottom-0 left-0 z-20 h-2 w-full cursor-ns-resize hover:bg-[#0d9488]/30"
              />
              <div
                aria-label="Redimensionar largura e altura"
                onPointerDown={(e) => startResize(e, { width: true, height: true })}
                className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-nwse-resize bg-[#0d9488]"
              />
            </>
          )}
        </>
      )}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"` then `pnpm typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"
git commit -m "feat: show height resize handle only on fillable media blocks"
```

---

## Task 3: ImageBlock fills

**Files:**
- Modify: `apps/web/app/[slug]/_components/blocks/ImageBlock.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/image-fill.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — create `image-fill.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ImageBlock } from '../ImageBlock'
import type { Block } from '@/lib/blocks/schema'

const img = (layout?: Block['layout']): Block => ({ id: 'i1', type: 'image', layout, props: { url: 'https://x.com/a.jpg', alt: 'a' } })

describe('image fill', () => {
  it('fills height when layout.height is set', () => {
    const { container } = render(<ImageBlock block={img({ width: 12, height: 300 })} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('img') as HTMLElement).className).toContain('h-full')
  })

  it('keeps natural height with no layout.height', () => {
    const { container } = render(<ImageBlock block={img()} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('img') as HTMLElement).className).not.toContain('h-full')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/image-fill.test.tsx"`
Expected: FAIL — img never has `h-full`.

- [ ] **Step 3: Implement** — replace `ImageBlock.tsx` with:

```tsx
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function ImageBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'image') return null
  const { url, alt, caption } = block.props
  const fill = !!block.layout?.height
  return (
    <figure className={fill ? 'h-full flex flex-col space-y-2' : 'space-y-2'}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={`w-full rounded-2xl object-cover ${fill ? 'flex-1 min-h-0 h-full' : ''}`}
      />
      {caption && <figcaption className="text-center text-sm text-gray-400">{caption}</figcaption>}
    </figure>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/image-fill.test.tsx"` then `pnpm typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/blocks/ImageBlock.tsx" "apps/web/app/[slug]/_components/blocks/__tests__/image-fill.test.tsx"
git commit -m "feat: image block fills its box when height is set"
```

---

## Task 4: HeroBlock fills

**Files:**
- Modify: `apps/web/app/[slug]/_components/blocks/HeroBlock.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/hero-fill.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — create `hero-fill.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HeroBlock } from '../HeroBlock'
import type { Block } from '@/lib/blocks/schema'

const hero = (layout?: Block['layout']): Block => ({ id: 'h1', type: 'hero', layout, props: { greeting: 'Oi', propertyName: 'Casa' } })

describe('hero fill', () => {
  it('fills height when layout.height is set', () => {
    const { container } = render(<HeroBlock block={hero({ width: 12, height: 400 })} ctx={{ whatsapp: null }} />)
    expect((container.firstChild as HTMLElement).className).toContain('h-full')
  })

  it('keeps natural height with no layout.height', () => {
    const { container } = render(<HeroBlock block={hero()} ctx={{ whatsapp: null }} />)
    expect((container.firstChild as HTMLElement).className).not.toContain('h-full')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/hero-fill.test.tsx"`
Expected: FAIL — root never has `h-full`.

- [ ] **Step 3: Implement** — replace `HeroBlock.tsx` with:

```tsx
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function HeroBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'hero') return null
  const { imageUrl, greeting, propertyName } = block.props
  const fill = !!block.layout?.height

  return (
    <div className={`bg-gaccent text-white px-6 pt-6 pb-12 rounded-b-[50px] shadow-2xl relative overflow-hidden ${fill ? 'h-full flex flex-col justify-end' : ''}`}>
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,transparent_0%,rgba(0,0,0,0.35)_90%)]" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gsecondary/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        <h2 className="text-xl text-white/90 font-medium tracking-tight">{greeting}</h2>
        <p className="text-4xl sm:text-5xl font-serif font-bold mt-1 text-gsecondary leading-[1.05]">{propertyName}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/hero-fill.test.tsx"` then `pnpm typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/blocks/HeroBlock.tsx" "apps/web/app/[slug]/_components/blocks/__tests__/hero-fill.test.tsx"
git commit -m "feat: hero block fills its box when height is set"
```

---

## Task 5: CarouselBlock fills

**Files:**
- Modify: `apps/web/app/[slug]/_components/blocks/CarouselBlock.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/carousel-fill.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — create `carousel-fill.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CarouselBlock } from '../CarouselBlock'
import type { Block } from '@/lib/blocks/schema'

const car = (layout?: Block['layout']): Block => ({ id: 'c1', type: 'carousel', layout, props: { images: [{ url: 'https://x.com/a.jpg', alt: 'a' }] } })

describe('carousel fill', () => {
  it('uses full-height figures when layout.height is set', () => {
    const { container } = render(<CarouselBlock block={car({ width: 12, height: 300 })} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('figure') as HTMLElement).className).toContain('h-full')
    expect((container.querySelector('img') as HTMLElement).className).not.toContain('h-56')
  })

  it('uses fixed-height slides with no layout.height', () => {
    const { container } = render(<CarouselBlock block={car()} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('img') as HTMLElement).className).toContain('h-56')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/carousel-fill.test.tsx"`
Expected: FAIL — figures always `h-56`, never `h-full`.

- [ ] **Step 3: Implement** — replace `CarouselBlock.tsx` with:

```tsx
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

type Img = { url: string; alt: string; caption?: string }

export function CarouselBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'carousel') return null
  const images = block.props.images.filter((i): i is Img => Boolean(i.url))
  if (images.length === 0) return null
  const fill = !!block.layout?.height
  return (
    <div className={`flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide p-2 ${fill ? 'h-full' : ''}`}>
      {images.map((img, idx) => (
        <figure key={idx} className={`snap-center shrink-0 w-[85%] max-w-md relative rounded-2xl overflow-hidden shadow-md ${fill ? 'h-full' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- guest pages use plain <img>, consistent with ImageBlock */}
          <img src={img.url} alt={img.alt} className={`w-full object-cover ${fill ? 'h-full' : 'h-56'}`} loading="lazy" />
          {img.caption && (
            <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs p-3">
              {img.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/carousel-fill.test.tsx"` then `pnpm typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/blocks/CarouselBlock.tsx" "apps/web/app/[slug]/_components/blocks/__tests__/carousel-fill.test.tsx"
git commit -m "feat: carousel fills its box when height is set"
```

---

## Task 6: Guest page full-height chain

**Files:**
- Modify: `apps/web/app/[slug]/_components/GuestSite.tsx`
- Test: `apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx` (append)

The renderers fill only when their parent has a real height. In the builder the inner wrapper is already `h-full` when `layout.height` is set; the guest `SectionView` renders the block directly inside the height'd wrapper, so the renderer's `h-full` has no full-height parent to resolve against. Wrap it.

- [ ] **Step 1: Write the failing test** — append to `GuestSite.test.tsx`:

```ts
it('gives height-resized media a full-height parent so it can fill', () => {
  const content: PageContent = { nav: 'onepage', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'image', layout: { width: 12, height: 320 }, props: { url: 'https://x.com/a.jpg', alt: 'a' } } ] } ] }
  const { container } = render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
  const img = container.querySelector('[data-block="b1"] img') as HTMLElement
  // the figure/img chain resolves h-full only if an ancestor inside the block wrapper is h-full
  expect(container.querySelector('[data-block="b1"] .h-full')).not.toBeNull()
  expect(img.className).toContain('h-full')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/GuestSite.test.tsx"`
Expected: FAIL — no `h-full` wrapper element inside the block.

- [ ] **Step 3: Implement** — in `GuestSite.tsx`, replace the `SectionView` body so the renderer gets an `h-full` parent when the block has a fixed height:

```tsx
function SectionView({ section, ctx }: { section: Section; ctx: RenderCtx }) {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-wrap items-start gap-x-3 gap-y-8">
      {section.blocks.map((b) => (
        <div
          key={b.id}
          data-block={b.id}
          style={blockFlexStyle(b.layout, b.type)}
          className="overflow-auto max-md:!h-auto max-md:!w-full max-md:!overflow-visible"
        >
          {b.layout?.height ? (
            <div className="h-full max-md:!h-auto">
              <BlockRenderer block={b} ctx={ctx} />
            </div>
          ) : (
            <BlockRenderer block={b} ctx={ctx} />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/GuestSite.test.tsx"` then `pnpm typecheck`
Expected: PASS (existing + new) + clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/GuestSite.tsx" "apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx"
git commit -m "feat: full-height parent for height-resized media on the guest page"
```

---

## Task 7: Full check + manual verification

- [ ] **Step 1: Typecheck + targeted tests**

Run: `pnpm typecheck`
Expected: clean.
Run: `pnpm --filter web test -- lib/blocks "app/[slug]/_components" "app/(app)/app/[id]/edit/_builder" --no-file-parallelism`
Expected: all green.

- [ ] **Step 2: Manual verification (`pnpm dev`)**

- Open `/app/<id>/edit`. Select a **cover (hero)** block → drag the bottom/corner handle → the cover grows/shrinks, image fills, greeting sinks to the bottom.
- Same for an **image** and a **carousel** block — media fills the box.
- Select a **text** or **wifi** block → only the width (right-edge) handle shows; no bottom/corner handle.
- Reload → heights persist; open `/<slug>` → media fills the same on desktop; narrow below `md` → media reverts to natural height (no clipping).

- [ ] **Step 3: Finish the branch**

Use superpowers:finishing-a-development-branch.

---

## Self-Review (completed by author)

- **Spec coverage:** `FILLABLE_BLOCKS` (Task 1 ✓); height handle gated to fillable (Task 2 ✓); ImageBlock/HeroBlock/CarouselBlock fill (Tasks 3–5 ✓); guest full-height chain (Task 6 ✓). Fillable set = hero/image/carousel, map excluded — matches spec. Mobile stays auto (`max-md:!h-auto` on the guest wrapper and the new inner wrapper).
- **Placeholder scan:** none — every renderer is given in full; the Preview handle block is shown in full.
- **Type consistency:** `FILLABLE_BLOCKS: ReadonlySet<string>`; renderers read `block.layout?.height`; Preview imports `FILLABLE_BLOCKS` from `@/lib/blocks/layout` alongside `blockFlexStyle`/`spanFromFraction`. Tests use `Block['layout']` for fixtures (no `as const`, to avoid the readonly/Block typecheck mismatch seen previously).
- **Note:** `min-h-0` on the filled image is required so the flex child can shrink below content size inside the fixed-height figure.
```
