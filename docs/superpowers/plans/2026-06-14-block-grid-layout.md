# Block Grid Layout & Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let hosts place blocks side by side and resize each block's width (12-col span) and height (px), with the layout collapsing responsively on a guest's phone.

**Architecture:** Each block gets an optional `layout` ({ width: 1–12 span, height?: px }) in the shared Zod schema. A flex-wrap container plus a per-block `min-width` (from `BLOCK_META.minW`) makes layouts responsive automatically — small blocks pair up on phones, large cards wrap to full rows. A shared `blockFlexStyle` helper drives both the builder preview and the live guest page. Resize uses native pointer handles in the preview that call a new `setBlockLayout` store action.

**Tech Stack:** Next.js 16, React 19, Zod v4, Zustand, @dnd-kit (core + sortable), Vitest 4, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-14-block-grid-layout-design.md`. **Builds on** Plan A + Plan B (both merged on `feat/page-builder-ui`).

**Conventions:**
- Tests: `pnpm --filter web test -- <path>`. Builder/guest render tests flake under full parallel load — when running multiple `_builder` files together add `--no-file-parallelism`.
- `@/` alias = `apps/web/` root.
- `layout` is **optional** in the schema (not `.default()`) so existing `PageContent` literals in tests need no edits; the render helper defaults a missing width to 12.
- Commit after each task with the message shown.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/web/lib/blocks/schema.ts` | add optional `blockLayout` to the block `base`. |
| `apps/web/lib/blocks/fields.ts` | add `minW: 'sm' \| 'lg'` to every `BLOCK_META` entry. |
| `apps/web/lib/blocks/layout.ts` (new) | `MIN_W_PX`, `blockFlexStyle`, `spanFromFraction`. |
| `apps/web/lib/blocks/__tests__/layout.test.ts` (new) | helper unit tests. |
| `apps/web/app/(app)/app/[id]/edit/_builder/store.ts` | `setBlockLayout` action. |
| `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx` | flex-wrap, `rectSortingStrategy`, apply `blockFlexStyle`, resize handles. |
| `apps/web/app/[slug]/_components/GuestSite.tsx` | `SectionView` → flex-wrap + `blockFlexStyle`. |

---

## Task 1: Add `layout` to the block schema

**Files:**
- Modify: `apps/web/lib/blocks/schema.ts`
- Test: `apps/web/lib/blocks/__tests__/schema-layout.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { blockSchema } from '../schema'

const heading = (extra: object = {}) => ({ id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 }, ...extra })

describe('block layout schema', () => {
  it('parses a block with no layout (layout is optional)', () => {
    const r = blockSchema.safeParse(heading())
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.layout).toBeUndefined()
  })

  it('accepts a valid layout span of 6 with a height', () => {
    const r = blockSchema.safeParse(heading({ layout: { width: 6, height: 200 } }))
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.layout).toEqual({ width: 6, height: 200 })
  })

  it('rejects a span greater than 12', () => {
    expect(blockSchema.safeParse(heading({ layout: { width: 13 } })).success).toBe(false)
  })

  it('rejects a span below 1', () => {
    expect(blockSchema.safeParse(heading({ layout: { width: 0 } })).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/schema-layout.test.ts`
Expected: FAIL — `layout: { width: 13 }` currently parses (unknown key stripped), so the "rejects" cases fail.

- [ ] **Step 3: Implement**

In `apps/web/lib/blocks/schema.ts`, replace the `base` definition (currently line 3):

```ts
export const blockLayout = z.object({
  width: z.number().int().min(1).max(12),
  height: z.number().int().positive().optional(),
}).optional()

const base = { id: z.string().min(1), layout: blockLayout }
```

(`base` is spread into every block member, so all 14 block types gain the optional field. No other change needed; `pageContentSchema` and the API `update-schema.ts` inherit it.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/schema-layout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/schema.ts apps/web/lib/blocks/__tests__/schema-layout.test.ts
git commit -m "feat: add optional layout (width span + height) to block schema"
```

---

## Task 2: Add per-type minimum width to `BLOCK_META`

**Files:**
- Modify: `apps/web/lib/blocks/fields.ts`
- Test: `apps/web/lib/blocks/__tests__/fields.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `apps/web/lib/blocks/__tests__/fields.test.ts` (inside the existing file, after the existing `describe`):

```ts
import { BLOCK_TYPES as ALL_TYPES } from '../defaults'

describe('block min width', () => {
  it.each(ALL_TYPES)('%s has a minW of sm or lg', (type) => {
    expect(['sm', 'lg']).toContain(BLOCK_META[type].minW)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/fields.test.ts`
Expected: FAIL — `BLOCK_META[type].minW` is `undefined`.

- [ ] **Step 3: Implement**

In `apps/web/lib/blocks/fields.ts`, change the `BLOCK_META` type and add `minW` to each entry. Replace the whole `BLOCK_META` declaration with:

```ts
export const BLOCK_META: Record<BlockType, { label: string; group: 'Básico' | 'Hospedagem' | 'Utilidades'; icon: string; minW: 'sm' | 'lg' }> = {
  heading:   { label: 'Título',     group: 'Básico',     icon: 'Heading',             minW: 'sm' },
  text:      { label: 'Texto',      group: 'Básico',     icon: 'Type',                minW: 'sm' },
  image:     { label: 'Imagem',     group: 'Básico',     icon: 'Image',               minW: 'sm' },
  button:    { label: 'Botão',      group: 'Básico',     icon: 'MousePointerClick',   minW: 'sm' },
  divider:   { label: 'Divisor',    group: 'Básico',     icon: 'Minus',               minW: 'sm' },
  hero:      { label: 'Capa',       group: 'Hospedagem', icon: 'PanelTop',            minW: 'lg' },
  wifi:      { label: 'Wi-Fi',      group: 'Hospedagem', icon: 'Wifi',                minW: 'lg' },
  checkin:   { label: 'Check-in',   group: 'Hospedagem', icon: 'Key',                 minW: 'lg' },
  checkout:  { label: 'Check-out',  group: 'Hospedagem', icon: 'LogOut',              minW: 'lg' },
  rules:     { label: 'Regras',     group: 'Hospedagem', icon: 'ClipboardList',       minW: 'lg' },
  guide:     { label: 'Guia Local', group: 'Hospedagem', icon: 'MapPin',              minW: 'lg' },
  emergency: { label: 'Emergência', group: 'Hospedagem', icon: 'PhoneCall',           minW: 'lg' },
  whatsapp:  { label: 'WhatsApp',   group: 'Utilidades', icon: 'MessageCircle',       minW: 'sm' },
  map:       { label: 'Mapa',       group: 'Utilidades', icon: 'Map',                 minW: 'sm' },
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/fields.test.ts`
Expected: PASS (all existing cases + 14 new).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/fields.ts apps/web/lib/blocks/__tests__/fields.test.ts
git commit -m "feat: add per-type min width hint to block meta"
```

---

## Task 3: Shared layout helper

**Files:**
- Create: `apps/web/lib/blocks/layout.ts`
- Test: `apps/web/lib/blocks/__tests__/layout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { blockFlexStyle, spanFromFraction, MIN_W_PX } from '../layout'

describe('blockFlexStyle', () => {
  it('maps a span of 6 to a half-width flex-basis minus the gap', () => {
    expect(blockFlexStyle({ width: 6 }, 'button').flexBasis).toBe('calc(50% - 0.75rem)')
  })

  it('maps a full span (12) to 100%', () => {
    expect(blockFlexStyle({ width: 12 }, 'text').flexBasis).toBe('100%')
  })

  it('defaults a missing layout to full width', () => {
    expect(blockFlexStyle(undefined, 'text').flexBasis).toBe('100%')
  })

  it('uses the lg min-width for card blocks', () => {
    expect(blockFlexStyle({ width: 6 }, 'wifi').minWidth).toBe(MIN_W_PX.lg)
  })

  it('uses the sm min-width for small blocks', () => {
    expect(blockFlexStyle({ width: 6 }, 'button').minWidth).toBe(MIN_W_PX.sm)
  })

  it('includes height only when set', () => {
    expect(blockFlexStyle({ width: 6 }, 'button').height).toBeUndefined()
    expect(blockFlexStyle({ width: 6, height: 200 }, 'button').height).toBe(200)
  })
})

describe('spanFromFraction', () => {
  it('snaps half the container to span 6', () => {
    expect(spanFromFraction(500, 1000)).toBe(6)
  })
  it('clamps a tiny width to span 1', () => {
    expect(spanFromFraction(10, 1000)).toBe(1)
  })
  it('clamps an over-wide drag to span 12', () => {
    expect(spanFromFraction(2000, 1000)).toBe(12)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/layout.test.ts`
Expected: FAIL — cannot resolve `../layout`.

- [ ] **Step 3: Implement**

```ts
import type { CSSProperties } from 'react'
import type { Block, BlockType } from './schema'
import { BLOCK_META } from './fields'

export const MIN_W_PX = { sm: 140, lg: 300 } as const

export function blockFlexStyle(layout: Block['layout'], type: BlockType): CSSProperties {
  const width = layout?.width ?? 12
  const pct = (width / 12) * 100
  return {
    flexBasis: width >= 12 ? '100%' : `calc(${pct}% - 0.75rem)`,
    minWidth: MIN_W_PX[BLOCK_META[type].minW],
    flexGrow: 0,
    flexShrink: 1,
    boxSizing: 'border-box',
    ...(layout?.height ? { height: layout.height } : {}),
  }
}

// Snap a dragged pixel width to the nearest 1–12 column span.
export function spanFromFraction(px: number, containerPx: number): number {
  if (containerPx <= 0) return 12
  const raw = Math.round((px / containerPx) * 12)
  return Math.min(12, Math.max(1, raw))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/layout.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/layout.ts apps/web/lib/blocks/__tests__/layout.test.ts
git commit -m "feat: shared block flex-layout helper"
```

---

## Task 4: `setBlockLayout` store action

**Files:**
- Modify: `apps/web/app/(app)/app/[id]/edit/_builder/store.ts`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('builder store', ...)` block in `store.test.ts`:

```ts
  it('setBlockLayout sets width and marks dirty', () => {
    store.getState().setBlockLayout('b1', { width: 6 })
    expect(store.getState().content.sections[0].blocks[0].layout).toEqual({ width: 6 })
    expect(store.getState().dirty).toBe(true)
  })

  it('setBlockLayout merges height onto an existing width', () => {
    store.getState().setBlockLayout('b1', { width: 6 })
    store.getState().setBlockLayout('b1', { height: 220 })
    expect(store.getState().content.sections[0].blocks[0].layout).toEqual({ width: 6, height: 220 })
  })

  it('setBlockLayout is undoable', () => {
    store.getState().setBlockLayout('b1', { width: 4 })
    store.getState().undo()
    expect(store.getState().content.sections[0].blocks[0].layout).toBeUndefined()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"`
Expected: FAIL — `setBlockLayout` is not a function.

- [ ] **Step 3: Implement**

In `store.ts`, add to the `BuilderState` interface (after `updateBlockProps`):

```ts
  setBlockLayout: (id: string, patch: Partial<NonNullable<Block['layout']>>) => void
```

Add the action to the returned object (after the `updateBlockProps` action):

```ts
      setBlockLayout: (id, patch) => commit((c) => {
        for (const s of c.sections) {
          const b = s.blocks.find((b) => b.id === id)
          if (b) { b.layout = { width: 12, ...b.layout, ...patch }; return }
        }
      }),
```

(`Block` is already imported in `store.ts`.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"`
Expected: PASS (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/store.ts" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"
git commit -m "feat: setBlockLayout store action with undo"
```

---

## Task 5: Preview — flex-wrap, span widths, resize handles

**Files:**
- Modify: `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx` (append)

- [ ] **Step 1: Write the failing test**

Append to `Preview.test.tsx`:

```ts
it('applies the span width as a flex-basis on the block wrapper', () => {
  const widthContent: PageContent = { nav: 'buttons', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 }, layout: { width: 6 } } ] } ] }
  const { container } = render(<Preview store={createBuilderStore(widthContent)} theme="modern" whatsapp={null} />)
  const wrapper = container.querySelector('[role="group"]') as HTMLElement
  expect(wrapper.style.flexBasis).toBe('calc(50% - 0.75rem)')
})
```

(`render`, `createBuilderStore`, `Preview`, and `PageContent` are already imported at the top of this test file.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"`
Expected: FAIL — no `flex-basis` style yet (wrapper has no role/style).

- [ ] **Step 3: Implement**

Replace the entire contents of `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx` with:

```tsx
'use client'

import { useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BlockRenderer } from '@/app/[slug]/_components/blocks/BlockRenderer'
import { blockFlexStyle, spanFromFraction } from '@/lib/blocks/layout'
import { useBuilder } from './store'
import type { BuilderStore } from './store'
import type { Block } from '@/lib/blocks/schema'

interface PreviewProps {
  store: BuilderStore
  theme: string
  whatsapp: string | null
}

const FULL_BLEED: ReadonlySet<Block['type']> = new Set(['hero', 'image', 'divider', 'map'])

interface SortableBlockProps {
  block: Block
  isSelected: boolean
  whatsapp: string | null
  containerRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onRemove: () => void
  onLayout: (id: string, patch: Partial<NonNullable<Block['layout']>>) => void
}

function SortableBlock({ block, isSelected, whatsapp, containerRef, onSelect, onRemove, onLayout }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const setRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el)
    wrapperRef.current = el
  }

  const style: React.CSSProperties = {
    ...blockFlexStyle(block.layout, block.type),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function startWidthResize(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return
    const containerW = container.getBoundingClientRect().width
    const left = wrapper.getBoundingClientRect().left
    const onMove = (ev: PointerEvent) => onLayout(block.id, { width: spanFromFraction(ev.clientX - left, containerW) })
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function startHeightResize(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const startY = e.clientY
    const startH = wrapper.getBoundingClientRect().height
    const onMove = (ev: PointerEvent) => onLayout(block.id, { height: Math.max(40, Math.round(startH + ev.clientY - startY)) })
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      ref={setRefs}
      style={style}
      role="group"
      className={[
        'group relative cursor-pointer transition-shadow',
        FULL_BLEED.has(block.type) ? '' : 'px-5',
        isSelected
          ? 'ring-2 ring-[#0d9488] ring-inset'
          : 'hover:ring-1 hover:ring-[#0d9488]/40 hover:ring-inset',
      ].join(' ')}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      {/* Disable inner links/buttons during edit: clicks select the block, never navigate */}
      <div className={['pointer-events-none select-none', block.layout?.height ? 'h-full overflow-auto' : ''].join(' ')}>
        <BlockRenderer block={block} ctx={{ whatsapp }} />
      </div>

      <button
        aria-label="Remover bloco"
        className="absolute right-1 top-1 z-30 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/80 text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:!opacity-100 focus:!opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        ✕
      </button>

      {isSelected && (
        <>
          <div
            role="separator"
            aria-label="Redimensionar largura"
            onPointerDown={startWidthResize}
            className="absolute right-0 top-0 z-20 h-full w-2 cursor-ew-resize hover:bg-[#0d9488]/30"
          />
          <div
            role="separator"
            aria-label="Redimensionar altura"
            onPointerDown={startHeightResize}
            className="absolute bottom-0 left-0 z-20 h-2 w-full cursor-ns-resize hover:bg-[#0d9488]/30"
          />
          <div
            aria-label="Redimensionar largura e altura"
            onPointerDown={(e) => {
              startWidthResize(e)
              startHeightResize(e)
            }}
            className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-nwse-resize bg-[#0d9488]"
          />
        </>
      )}
    </div>
  )
}

export function Preview({ store, theme, whatsapp }: PreviewProps) {
  const content = useBuilder(store, (s) => s.content)
  const activeSectionId = useBuilder(store, (s) => s.activeSectionId)
  const selectedBlockId = useBuilder(store, (s) => s.selectedBlockId)

  const activeSection =
    content.sections.find((s) => s.id === activeSectionId) ?? content.sections[0]

  const blockIds = activeSection.blocks.map((b) => b.id)
  const { setNodeRef, isOver } = useDroppable({ id: 'preview-dropzone' })
  const containerRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/40 p-6">
      <div
        ref={setNodeRef}
        data-theme={theme}
        className={[
          'guest-site relative w-full max-w-3xl rounded-2xl shadow-2xl bg-background overflow-hidden',
          isOver ? 'ring-2 ring-[#0d9488]' : '',
        ].join(' ')}
      >
        {activeSection.blocks.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Adicione blocos pelo painel à esquerda
          </p>
        ) : (
          <SortableContext items={blockIds} strategy={rectSortingStrategy}>
            <div ref={containerRef} className="flex flex-wrap items-start gap-x-3 gap-y-8 pb-8">
              {activeSection.blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  whatsapp={whatsapp}
                  containerRef={containerRef}
                  onSelect={() => store.getState().selectBlock(block.id)}
                  onRemove={() => store.getState().removeBlock(block.id)}
                  onLayout={(id, patch) => store.getState().setBlockLayout(id, patch)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"`
Expected: PASS (existing 2 + new). Also run the Builder test (it renders Preview):
Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Builder.test.tsx" --no-file-parallelism`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"
git commit -m "feat: builder block resize (width span + height) and flex-wrap layout"
```

---

## Task 6: Guest page — apply the same flex-wrap layout

**Files:**
- Modify: `apps/web/app/[slug]/_components/GuestSite.tsx`
- Test: `apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx` (append)

- [ ] **Step 1: Write the failing test**

Append to `GuestSite.test.tsx` (it already imports `render`, `screen`, `GuestSite`, and `PageContent` — reuse them; if a needed import is missing, add it at the top):

```ts
it('applies the block span as a flex-basis on the guest page', () => {
  const content: PageContent = { nav: 'onepage', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Olá', level: 1 }, layout: { width: 6 } } ] } ] }
  const { container } = render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
  const wrapper = container.querySelector('[data-block="b1"]') as HTMLElement
  expect(wrapper.style.flexBasis).toBe('calc(50% - 0.75rem)')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/GuestSite.test.tsx"`
Expected: FAIL — no `[data-block]` element / no flex-basis.

- [ ] **Step 3: Implement**

In `apps/web/app/[slug]/_components/GuestSite.tsx`:

Add the import near the other block imports (after the `Icon` import):

```ts
import { blockFlexStyle } from '@/lib/blocks/layout'
```

Replace the `SectionView` function with:

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
          <BlockRenderer block={b} ctx={ctx} />
        </div>
      ))}
    </div>
  )
}
```

(`max-md:!w-full` forces a single column on phones regardless of span; `max-md:!h-auto` and `max-md:!overflow-visible` drop any fixed height so nothing clips on mobile. `min-width` from `blockFlexStyle` still lets `sm` blocks pair on slightly wider phones in landscape, but the safe default on portrait is full width.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/GuestSite.test.tsx"`
Expected: PASS (existing 3 + new).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/GuestSite.tsx" "apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx"
git commit -m "feat: data-driven block widths on the guest page"
```

---

## Task 7: Full check + manual verification

- [ ] **Step 1: Typecheck + targeted tests**

Run: `pnpm typecheck`
Expected: clean.
Run: `pnpm --filter web test -- lib/blocks "app/(app)/app/[id]/edit/_builder" "app/[slug]/_components/__tests__/GuestSite.test.tsx" --no-file-parallelism`
Expected: all green.

- [ ] **Step 2: Manual verification (`pnpm dev`)**

- Open `/app/<id>/edit`. Add two `button` blocks. Select one, drag its right edge left to ~half → both buttons sit side by side.
- Drag a button's bottom edge → height grows; corner handle changes both.
- Set a large card (Wi-Fi) to half width → it keeps its min-width and stays readable.
- Clicking a block's inner link/button selects it (no navigation/new tab).
- Reload → widths/heights persisted (autosave wrote `content`).
- Open the public `/<slug>` on a desktop → side-by-side widths show; narrow the window below `md` → blocks stack to one column, no clipping.

- [ ] **Step 3: Finish the branch**

Use superpowers:finishing-a-development-branch.

---

## Self-Review (completed by author)

- **Spec coverage:** layout schema (Task 1 ✓), per-type min width (Task 2 ✓), shared `blockFlexStyle`/`spanFromFraction` helper (Task 3 ✓), `setBlockLayout` store action with undo (Task 4 ✓), builder flex-wrap + `rectSortingStrategy` + resize handles (Task 5 ✓), guest-page responsive widths with mobile collapse + height-auto (Task 6 ✓), inert-during-edit (#3) already shipped before this plan. Out-of-scope items (mobile fixed height, cross-section drag, pixel x/y, per-breakpoint manual layouts) match the spec.
- **Deviation from spec (flagged):** spec wrote `blockLayout` with `.default({ width: 12 })`; the plan uses `.optional()` instead so existing test `PageContent` literals need no edits — `blockFlexStyle` supplies the width-12 default at render time, identical visual result, still no DB migration. `createBlock` is left unchanged (new blocks render full-width via the helper default).
- **Placeholder scan:** none — every code step contains full code; `BLOCK_META` is repeated in full in Task 2; the full `Preview.tsx` is given in Task 5.
- **Type consistency:** `blockFlexStyle(layout, type)`, `spanFromFraction(px, containerPx)`, `MIN_W_PX`, `setBlockLayout(id, patch: Partial<NonNullable<Block['layout']>>)`, and `BLOCK_META[].minW: 'sm' | 'lg'` are used consistently across Tasks 2–6. The `Preview` `onLayout` prop signature matches `setBlockLayout`.
```
