# New Content Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four host-authorable content blocks — callout, accordion, link card, carousel — that follow the existing block pattern and inherit the page theme.

**Architecture:** Each block is a flat Zod member of the discriminated union with structured props, a default in `defaults.ts`, palette/inspector config in `fields.ts`, and a renderer registered in `BlockRenderer`. Because `DEFAULT_PROPS`, `BLOCK_META`, and `BLOCK_FIELDS` are exhaustive `Record<BlockType, …>`, each block must be added across schema + defaults + fields in the same commit to keep typecheck green — so each task ships one complete block end-to-end.

**Tech Stack:** Next.js 16 (App Router, React 19), Zod v4, Tailwind v4, lucide-react, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-06-15-new-blocks-design.md`. Branch: `feat/new-blocks`.

**Conventions:**
- Tests: `pnpm --filter web test -- <path>`. `@/` = `apps/web/`.
- The inspector already renders `select`/`textarea`/`icon`/`list` field kinds — no inspector changes needed.
- `safeHref` and `optionalUrl` already exist in `schema.ts` (used so cleared/empty list fields don't fail save).
- Renderers use existing theme tokens (`gaccent`, `gaccent-strong`, `gsecondary`, `gbg`) so they inherit the page theme.
- Commit after each task. Ignore the harmless `.bashrc` `$'...export'` warning.

---

## Task 1: Callout block

**Files:**
- Modify: `apps/web/lib/blocks/schema.ts`, `apps/web/lib/blocks/defaults.ts`, `apps/web/lib/blocks/fields.ts`, `apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx`
- Create: `apps/web/app/[slug]/_components/blocks/CalloutBlock.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/callout.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { CalloutBlock } from '../CalloutBlock'

describe('callout', () => {
  it('parses a valid callout block', () => {
    const r = blockSchema.safeParse({ id: 'c1', type: 'callout', props: { variant: 'tip', icon: 'Lightbulb', text: 'Oi' } })
    expect(r.success).toBe(true)
  })

  it('renders its text', () => {
    render(<CalloutBlock block={{ id: 'c1', type: 'callout', props: { variant: 'warning', icon: 'Lightbulb', text: 'Cuidado' } }} ctx={{ whatsapp: null }} />)
    expect(screen.getByText('Cuidado')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/callout.test.tsx"`
Expected: FAIL — cannot resolve `../CalloutBlock` (and `callout` not in the union yet).

- [ ] **Step 3: Implement**

In `schema.ts`, add the block (after `mapBlock`):

```ts
export const calloutBlock = z.object({ ...base, type: z.literal('callout'),
  props: z.object({
    variant: z.enum(['tip', 'info', 'warning']).default('tip'),
    icon: z.string().default('Lightbulb'),
    text: z.string(),
  }) })
```

Add `calloutBlock` to the `z.discriminatedUnion('type', [...])` array.

In `defaults.ts`: add `'callout'` to the `BLOCK_TYPES` array, and add to `DEFAULT_PROPS`:

```ts
  callout: { variant: 'tip', icon: 'Lightbulb', text: 'Dica para o hóspede' },
```

In `fields.ts`: add to `BLOCK_META`:

```ts
  callout:   { label: 'Dica',     group: 'Básico', icon: 'Lightbulb',         minW: 'sm' },
```

and to `BLOCK_FIELDS`:

```ts
  callout: [
    { key: 'variant', label: 'Estilo', kind: 'select', options: [
      { value: 'tip', label: 'Dica' }, { value: 'info', label: 'Informação' }, { value: 'warning', label: 'Aviso' } ] },
    { key: 'icon', label: 'Ícone', kind: 'icon' },
    { key: 'text', label: 'Texto', kind: 'textarea' },
  ],
```

Create `apps/web/app/[slug]/_components/blocks/CalloutBlock.tsx`:

```tsx
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'
import { Icon } from './Icon'

const VARIANT: Record<'tip' | 'info' | 'warning', string> = {
  tip: 'bg-gaccent/10 text-gaccent-strong border-gaccent/30',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-gsecondary/15 text-gaccent-strong border-gsecondary/40',
}

export function CalloutBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'callout') return null
  const { variant, icon, text } = block.props
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${VARIANT[variant]}`}>
      <Icon name={icon} size={22} className="shrink-0 mt-0.5" />
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  )
}
```

In `BlockRenderer.tsx`: import `CalloutBlock` and add `callout: CalloutBlock,` to `REGISTRY`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/callout.test.tsx" lib/blocks/__tests__/defaults.test.ts lib/blocks/__tests__/fields.test.ts`
Expected: PASS (callout 2 + the existing `it.each` suites now including `callout`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/schema.ts apps/web/lib/blocks/defaults.ts apps/web/lib/blocks/fields.ts "apps/web/app/[slug]/_components/blocks/CalloutBlock.tsx" "apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx" "apps/web/app/[slug]/_components/blocks/__tests__/callout.test.tsx"
git commit -m "feat: callout (tip balloon) block"
```

---

## Task 2: Accordion block

**Files:**
- Modify: `apps/web/lib/blocks/schema.ts`, `defaults.ts`, `fields.ts`, `BlockRenderer.tsx`
- Create: `apps/web/app/[slug]/_components/blocks/AccordionBlock.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/accordion.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { AccordionBlock } from '../AccordionBlock'

const block = { id: 'a1', type: 'accordion', props: { items: [
  { icon: 'Info', title: 'Como ligar a TV', summary: 'resumo', body: 'aperte o botão' } ] } } as const

describe('accordion', () => {
  it('parses a valid accordion block', () => {
    expect(blockSchema.safeParse(block).success).toBe(true)
  })

  it('reveals the body only after clicking the row', () => {
    render(<AccordionBlock block={block} ctx={{ whatsapp: null }} />)
    expect(screen.queryByText('aperte o botão')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Como ligar a TV'))
    expect(screen.getByText('aperte o botão')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/accordion.test.tsx"`
Expected: FAIL — cannot resolve `../AccordionBlock`.

- [ ] **Step 3: Implement**

In `schema.ts`, add (after `calloutBlock`):

```ts
export const accordionBlock = z.object({ ...base, type: z.literal('accordion'),
  props: z.object({
    items: z.array(z.object({
      icon: z.string().default('Info'),
      title: z.string(),
      summary: z.string().default(''),
      body: z.string().default(''),
    })).default([]),
  }) })
```

Add `accordionBlock` to the discriminated union array.

In `defaults.ts`: add `'accordion'` to `BLOCK_TYPES`; add to `DEFAULT_PROPS`:

```ts
  accordion: { items: [{ icon: 'Info', title: 'Item', summary: '', body: '' }] },
```

In `fields.ts`: add to `BLOCK_META`:

```ts
  accordion: { label: 'Sanfona',  group: 'Básico', icon: 'ChevronsUpDown',     minW: 'lg' },
```

add to `BLOCK_FIELDS`:

```ts
  accordion: [
    { key: 'items', label: 'Itens', kind: 'list', itemFields: [
      { key: 'icon', label: 'Ícone', kind: 'icon' },
      { key: 'title', label: 'Título', kind: 'text' },
      { key: 'summary', label: 'Resumo', kind: 'text' },
      { key: 'body', label: 'Detalhes', kind: 'textarea' } ] },
  ],
```

Create `apps/web/app/[slug]/_components/blocks/AccordionBlock.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'
import { Icon } from './Icon'

interface Item { icon: string; title: string; summary: string; body: string }

function AccordionItem({ item }: { item: Item }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isOpen ? 'border-gaccent ring-1 ring-gaccent/10' : 'border-gray-100'}`}>
      <button onClick={() => setIsOpen((o) => !o)} className="w-full p-4 flex gap-3 text-left items-start">
        <div className={`p-2 h-fit rounded-lg ${isOpen ? 'bg-gaccent/10' : 'bg-gray-50'}`}>
          <Icon name={item.icon} size={20} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-bold text-sm text-gray-800">{item.title}</h4>
            {isOpen ? <ChevronUp size={20} className="text-gray-400 shrink-0" /> : <ChevronDown size={20} className="text-gray-400 shrink-0" />}
          </div>
          {item.summary && <p className="text-sm text-gray-600 leading-relaxed mt-1">{item.summary}</p>}
        </div>
      </button>
      {isOpen && item.body && (
        <div className="px-4 pb-4 animate-fadeIn">
          <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">{item.body}</p>
        </div>
      )}
    </div>
  )
}

export function AccordionBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'accordion') return null
  return (
    <div className="space-y-3 p-2">
      {block.props.items.map((item, idx) => <AccordionItem key={idx} item={item} />)}
    </div>
  )
}
```

In `BlockRenderer.tsx`: import `AccordionBlock`, add `accordion: AccordionBlock,` to `REGISTRY`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/accordion.test.tsx" lib/blocks/__tests__/defaults.test.ts lib/blocks/__tests__/fields.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/schema.ts apps/web/lib/blocks/defaults.ts apps/web/lib/blocks/fields.ts "apps/web/app/[slug]/_components/blocks/AccordionBlock.tsx" "apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx" "apps/web/app/[slug]/_components/blocks/__tests__/accordion.test.tsx"
git commit -m "feat: accordion (expandable items) block"
```

---

## Task 3: Link card block

**Files:**
- Modify: `apps/web/lib/blocks/schema.ts`, `defaults.ts`, `fields.ts`, `BlockRenderer.tsx`
- Create: `apps/web/app/[slug]/_components/blocks/LinkCardBlock.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/linkcard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { LinkCardBlock } from '../LinkCardBlock'

describe('linkcard', () => {
  it('parses a link card, tolerating an empty href row', () => {
    const r = blockSchema.safeParse({ id: 'l1', type: 'linkcard', props: { title: 'T', text: '', links: [
      { label: 'Site', href: 'https://x.com' }, { label: 'vazio', href: '' } ] } })
    expect(r.success).toBe(true)
  })

  it('renders links with an href and omits empty-href ones', () => {
    render(<LinkCardBlock block={{ id: 'l1', type: 'linkcard', props: { title: 'T', text: '', links: [
      { label: 'Site', href: 'https://x.com' }, { label: 'Vazio', href: '' } ] } }} ctx={{ whatsapp: null }} />)
    expect(screen.getByRole('link', { name: 'Site' })).toHaveAttribute('href', 'https://x.com')
    expect(screen.queryByText('Vazio')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/linkcard.test.tsx"`
Expected: FAIL — cannot resolve `../LinkCardBlock`.

- [ ] **Step 3: Implement**

In `schema.ts`, add (after `accordionBlock`):

```ts
export const linkcardBlock = z.object({ ...base, type: z.literal('linkcard'),
  props: z.object({
    title: z.string(),
    text: z.string().default(''),
    links: z.array(z.object({
      label: z.string(),
      href: safeHref.or(z.literal('')),
    })).default([]),
  }) })
```

Add `linkcardBlock` to the discriminated union array.

In `defaults.ts`: add `'linkcard'` to `BLOCK_TYPES`; add to `DEFAULT_PROPS`:

```ts
  linkcard: { title: 'Card', text: '', links: [{ label: 'Link', href: 'https://' }] },
```

In `fields.ts`: add to `BLOCK_META`:

```ts
  linkcard:  { label: 'Card',     group: 'Básico', icon: 'SquareStack',       minW: 'lg' },
```

add to `BLOCK_FIELDS`:

```ts
  linkcard: [
    { key: 'title', label: 'Título', kind: 'text' },
    { key: 'text', label: 'Texto', kind: 'textarea' },
    { key: 'links', label: 'Links', kind: 'list', itemFields: [
      { key: 'label', label: 'Rótulo', kind: 'text' },
      { key: 'href', label: 'Destino', kind: 'text' } ] },
  ],
```

Create `apps/web/app/[slug]/_components/blocks/LinkCardBlock.tsx`:

```tsx
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function LinkCardBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'linkcard') return null
  const { title, text, links } = block.props
  const valid = links.filter((l) => l.href)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="font-serif font-bold text-lg text-gaccent">{title}</h3>
        {text && <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">{text}</p>}
      </div>
      {valid.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {valid.map((l, idx) => (
            <a
              key={idx}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gaccent text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
```

In `BlockRenderer.tsx`: import `LinkCardBlock`, add `linkcard: LinkCardBlock,` to `REGISTRY`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/linkcard.test.tsx" lib/blocks/__tests__/defaults.test.ts lib/blocks/__tests__/fields.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/schema.ts apps/web/lib/blocks/defaults.ts apps/web/lib/blocks/fields.ts "apps/web/app/[slug]/_components/blocks/LinkCardBlock.tsx" "apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx" "apps/web/app/[slug]/_components/blocks/__tests__/linkcard.test.tsx"
git commit -m "feat: link card block"
```

---

## Task 4: Carousel block

**Files:**
- Modify: `apps/web/lib/blocks/schema.ts`, `defaults.ts`, `fields.ts`, `BlockRenderer.tsx`
- Create: `apps/web/app/[slug]/_components/blocks/CarouselBlock.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/carousel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { CarouselBlock } from '../CarouselBlock'

describe('carousel', () => {
  it('parses a carousel, tolerating an empty url row', () => {
    const r = blockSchema.safeParse({ id: 'c1', type: 'carousel', props: { images: [
      { url: 'https://x.com/a.jpg', alt: 'a' }, { url: '', alt: '' } ] } })
    expect(r.success).toBe(true)
  })

  it('renders one img per non-empty image and skips empty-url entries', () => {
    const { container } = render(<CarouselBlock block={{ id: 'c1', type: 'carousel', props: { images: [
      { url: 'https://x.com/a.jpg', alt: 'a' }, { url: '', alt: '' } ] } }} ctx={{ whatsapp: null }} />)
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/carousel.test.tsx"`
Expected: FAIL — cannot resolve `../CarouselBlock`.

- [ ] **Step 3: Implement**

In `schema.ts`, add (after `linkcardBlock`):

```ts
export const carouselBlock = z.object({ ...base, type: z.literal('carousel'),
  props: z.object({
    images: z.array(z.object({
      url: optionalUrl,
      alt: z.string().default(''),
      caption: z.string().optional(),
    })).default([]),
  }) })
```

Add `carouselBlock` to the discriminated union array.

In `defaults.ts`: add `'carousel'` to `BLOCK_TYPES`; add to `DEFAULT_PROPS`:

```ts
  carousel: { images: [{ url: 'https://placehold.co/800x500', alt: '', caption: '' }] },
```

In `fields.ts`: add to `BLOCK_META`:

```ts
  carousel:  { label: 'Carrossel', group: 'Básico', icon: 'GalleryHorizontal', minW: 'lg' },
```

add to `BLOCK_FIELDS`:

```ts
  carousel: [
    { key: 'images', label: 'Imagens', kind: 'list', itemFields: [
      { key: 'url', label: 'URL da imagem', kind: 'text' },
      { key: 'alt', label: 'Descrição (alt)', kind: 'text' },
      { key: 'caption', label: 'Legenda', kind: 'text' } ] },
  ],
```

Create `apps/web/app/[slug]/_components/blocks/CarouselBlock.tsx`:

```tsx
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

type Img = { url: string; alt: string; caption?: string }

export function CarouselBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'carousel') return null
  const images = block.props.images.filter((i): i is Img => Boolean(i.url))
  if (images.length === 0) return null
  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide p-2">
      {images.map((img, idx) => (
        <figure key={idx} className="snap-center shrink-0 w-[85%] max-w-md relative rounded-2xl overflow-hidden shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- guest pages use plain <img>, consistent with ImageBlock */}
          <img src={img.url} alt={img.alt} className="w-full h-56 object-cover" loading="lazy" />
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

In `BlockRenderer.tsx`: import `CarouselBlock`, add `carousel: CarouselBlock,` to `REGISTRY`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/carousel.test.tsx" lib/blocks/__tests__/defaults.test.ts lib/blocks/__tests__/fields.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/schema.ts apps/web/lib/blocks/defaults.ts apps/web/lib/blocks/fields.ts "apps/web/app/[slug]/_components/blocks/CarouselBlock.tsx" "apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx" "apps/web/app/[slug]/_components/blocks/__tests__/carousel.test.tsx"
git commit -m "feat: photo carousel block"
```

---

## Task 5: Full check + manual verification

- [ ] **Step 1: Typecheck + targeted tests**

Run: `pnpm typecheck`
Expected: clean (all four `Record<BlockType, …>` are exhaustive).
Run: `pnpm --filter web test -- lib/blocks "app/[slug]/_components/blocks" "app/(app)/app/[id]/edit/_builder" --no-file-parallelism`
Expected: all green.

- [ ] **Step 2: Manual verification (`pnpm dev`)**

- Open `/app/<id>/edit`. From the palette (Básico group), add each new block: Dica, Sanfona, Card, Carrossel.
- Callout: change variant → color changes; pick an icon.
- Accordion: add items, set icon/title/summary/body; in the live page the row expands on click.
- Link card: add links; an empty-href row saves without error and is omitted on the page.
- Carousel: paste 2-3 image URLs; the gallery scroll-snaps; an empty-url row is skipped.
- Apply a theme (Tema panel) → the new blocks pick up the accent color.
- Reload → all persisted; open `/<slug>` → blocks render the same.

- [ ] **Step 3: Finish the branch**

Use superpowers:finishing-a-development-branch.

---

## Self-Review (completed by author)

- **Spec coverage:** callout (Task 1 ✓), accordion (Task 2 ✓), linkcard (Task 3 ✓), carousel (Task 4 ✓); each adds schema member + default + meta + fields + renderer + registry in one green commit. Empty-list-row tolerance via `safeHref.or('')` (linkcard) and `optionalUrl` (carousel) — tested in Tasks 3 & 4. Renderers use theme tokens (inherit sub-project A). Out-of-scope items (nesting, autoplay, video) excluded.
- **Placeholder scan:** none — every renderer and config block is given in full.
- **Type consistency:** each block adds to `blockSchema` union, `BLOCK_TYPES`, `DEFAULT_PROPS`, `BLOCK_META` (label/group/icon/minW), `BLOCK_FIELDS`, and `REGISTRY` — the exhaustive `Record<BlockType, …>` types force all of these, so a missing entry fails typecheck. Field kinds used (`select`/`textarea`/`icon`/`list`) are all already handled by the inspector. `CarouselBlock`'s type guard narrows `optionalUrl`'s `string | undefined` to `string`.
- **Note:** `BLOCK_META` palette icons (`Lightbulb`, `ChevronsUpDown`, `SquareStack`, `GalleryHorizontal`) and renderer chevrons are valid lucide-react exports.
```
