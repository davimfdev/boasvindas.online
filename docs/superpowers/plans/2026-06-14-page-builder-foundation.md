# Page Builder — Plan A: Data-Driven Guest Page (Foundation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded guest landing page with a data-driven block tree stored as JSONB, rendered by shared block components, so a page's content lives in the database and renders mobile-correct from data.

**Architecture:** A page's content is one JSON document (`PageContent`) validated by a Zod discriminated union. A `content jsonb` column on `pages` stores it. A `<BlockRenderer>` walks the tree and dispatches each block to a render component (ported from today's hardcoded sections). `GuestSite` is refactored from a fixed `switch` to data-driven rendering with two nav styles (button-nav, one-page scroll). Rows with no `content` fall back to a default template at read time (no prod seeding in migrations).

**Tech Stack:** Next.js 15 (App Router), Drizzle + Neon Postgres, Zod v4, Vitest 4, Tailwind v4, lucide-react. This plan adds **no** builder UI — content is seeded from templates; Plan B adds editing.

**Spec:** `docs/superpowers/specs/2026-06-14-page-builder-design.md`

**Conventions for this plan:**
- Tests: `pnpm --filter web test -- <path>` (vitest run). Run the single file, not the suite.
- Block schemas/types/templates/renderers live under `apps/web/lib/blocks/` and `apps/web/app/[slug]/_components/blocks/`.
- Commit after each task with the message shown.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/web/lib/blocks/schema.ts` | Zod schemas: every `Block` variant, `Section`, `PageContent`. Exported inferred TS types. Single source of truth. |
| `apps/web/lib/blocks/__tests__/schema.test.ts` | Schema valid/invalid tests. |
| `apps/web/lib/blocks/templates.ts` | Starter template trees (`apeCompleto`, `enxuto`, `emBranco`) + `DEFAULT_TEMPLATE`. |
| `apps/web/lib/blocks/__tests__/templates.test.ts` | Templates conform to `PageContent`. |
| `apps/web/lib/db/schema.ts` | Add `content jsonb` column (modify). |
| `apps/web/lib/db/migrations/0002_*.sql` | Generated additive migration. |
| `apps/web/lib/db/queries.ts` | `getPublishedPageBySlug(slug)` returning content with default fallback. |
| `apps/web/lib/db/__tests__/content-fallback.test.ts` | Null content → default template. |
| `apps/web/app/api/pages/[id]/route.ts` | Accept + validate `content` on PUT (modify). |
| `apps/web/app/api/pages/[id]/__tests__/content-validation.test.ts` | Invalid content → 400. |
| `apps/web/app/[slug]/_components/blocks/*.tsx` | One render component per block type. |
| `apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx` | Registry + dispatcher, defensive on unknown types. |
| `apps/web/app/[slug]/_components/blocks/__tests__/BlockRenderer.test.tsx` | Dispatch + unknown-block tests. |
| `apps/web/app/[slug]/_components/GuestSite.tsx` | Refactor to data-driven + nav styles (modify). |
| `apps/web/app/[slug]/page.tsx` | Pass content to `GuestSite` (modify). |

---

## Task 1: Block + PageContent Zod schema

**Files:**
- Create: `apps/web/lib/blocks/schema.ts`
- Test: `apps/web/lib/blocks/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/blocks/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest'
import { blockSchema, pageContentSchema } from '../schema'

describe('blockSchema', () => {
  it('accepts a valid wifi block', () => {
    const result = blockSchema.safeParse({
      id: 'b1', type: 'wifi', props: { ssid: 'Net', password: 'pass1234' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects a wifi block missing its password', () => {
    const result = blockSchema.safeParse({
      id: 'b1', type: 'wifi', props: { ssid: 'Net' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown block type', () => {
    const result = blockSchema.safeParse({ id: 'b1', type: 'bogus', props: {} })
    expect(result.success).toBe(false)
  })
})

describe('pageContentSchema', () => {
  it('accepts a page with one section containing one block', () => {
    const result = pageContentSchema.safeParse({
      nav: 'buttons',
      sections: [{ id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } },
      ] }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid nav style', () => {
    const result = pageContentSchema.safeParse({ nav: 'carousel', sections: [] })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/schema.test.ts`
Expected: FAIL — cannot resolve `../schema`.

- [ ] **Step 3: Write the schema**

```ts
// apps/web/lib/blocks/schema.ts
import { z } from 'zod'

const base = { id: z.string().min(1) }

export const headingBlock = z.object({ ...base, type: z.literal('heading'),
  props: z.object({ text: z.string(), level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }) })

export const textBlock = z.object({ ...base, type: z.literal('text'),
  props: z.object({ text: z.string() }) }) // plain text, rendered whitespace-pre-wrap (no raw HTML — XSS-safe)

export const imageBlock = z.object({ ...base, type: z.literal('image'),
  props: z.object({ url: z.string().url(), alt: z.string().default(''), caption: z.string().optional() }) })

export const buttonBlock = z.object({ ...base, type: z.literal('button'),
  props: z.object({ label: z.string(), href: z.string(), kind: z.enum(['link', 'tel', 'whatsapp', 'map']).default('link') }) })

export const dividerBlock = z.object({ ...base, type: z.literal('divider'),
  props: z.object({ variant: z.enum(['line', 'spacer']).default('line') }) })

export const wifiBlock = z.object({ ...base, type: z.literal('wifi'),
  props: z.object({ ssid: z.string().min(1), password: z.string().min(1) }) })

export const checkinBlock = z.object({ ...base, type: z.literal('checkin'),
  props: z.object({ time: z.string(), address: z.string(), accessCode: z.string().optional(), instructions: z.string().default('') }) })

export const checkoutBlock = z.object({ ...base, type: z.literal('checkout'),
  props: z.object({ time: z.string(), items: z.array(z.string()).default([]) }) })

export const rulesBlock = z.object({ ...base, type: z.literal('rules'),
  props: z.object({ items: z.array(z.object({ icon: z.string(), label: z.string() })).default([]) }) })

export const guideBlock = z.object({ ...base, type: z.literal('guide'),
  props: z.object({ places: z.array(z.object({
    name: z.string(), blurb: z.string().default(''), distance: z.string().optional(), mapUrl: z.string().url().optional(),
  })).default([]) }) })

export const emergencyBlock = z.object({ ...base, type: z.literal('emergency'),
  props: z.object({ contacts: z.array(z.object({ label: z.string(), phone: z.string() })).default([]) }) })

export const heroBlock = z.object({ ...base, type: z.literal('hero'),
  props: z.object({ imageUrl: z.string().url().optional(), greeting: z.string(), propertyName: z.string() }) })

export const whatsappBlock = z.object({ ...base, type: z.literal('whatsapp'),
  props: z.object({ number: z.string(), message: z.string().optional() }) })

export const mapBlock = z.object({ ...base, type: z.literal('map'),
  props: z.object({ query: z.string(), label: z.string().optional() }) })

export const blockSchema = z.discriminatedUnion('type', [
  headingBlock, textBlock, imageBlock, buttonBlock, dividerBlock,
  wifiBlock, checkinBlock, checkoutBlock, rulesBlock, guideBlock,
  emergencyBlock, heroBlock, whatsappBlock, mapBlock,
])

export const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  icon: z.string(),
  blocks: z.array(blockSchema),
})

export const pageContentSchema = z.object({
  nav: z.enum(['buttons', 'onepage']),
  sections: z.array(sectionSchema),
})

export type Block = z.infer<typeof blockSchema>
export type Section = z.infer<typeof sectionSchema>
export type PageContent = z.infer<typeof pageContentSchema>
export type BlockType = Block['type']
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/schema.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/schema.ts apps/web/lib/blocks/__tests__/schema.test.ts
git commit -m "feat: block + page-content zod schema"
```

---

## Task 2: Starter templates

**Files:**
- Create: `apps/web/lib/blocks/templates.ts`
- Test: `apps/web/lib/blocks/__tests__/templates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/blocks/__tests__/templates.test.ts
import { describe, it, expect } from 'vitest'
import { pageContentSchema } from '../schema'
import { TEMPLATES, DEFAULT_TEMPLATE } from '../templates'

describe('templates', () => {
  it.each(Object.entries(TEMPLATES))('template %s is valid PageContent', (_name, tree) => {
    expect(pageContentSchema.safeParse(tree).success).toBe(true)
  })

  it('DEFAULT_TEMPLATE is one of the templates', () => {
    expect(Object.values(TEMPLATES)).toContain(DEFAULT_TEMPLATE)
  })

  it('apeCompleto has a wifi block somewhere', () => {
    const hasWifi = TEMPLATES.apeCompleto.sections.some((s) => s.blocks.some((b) => b.type === 'wifi'))
    expect(hasWifi).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/templates.test.ts`
Expected: FAIL — cannot resolve `../templates`.

- [ ] **Step 3: Write the templates**

```ts
// apps/web/lib/blocks/templates.ts
import type { PageContent } from './schema'

const apeCompleto: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 'home', title: 'Início', icon: 'Home', blocks: [
      { id: 'h1', type: 'hero', props: { greeting: 'Seja bem-vindo!', propertyName: 'Apartamento 101' } },
      { id: 'h2', type: 'text', props: { text: 'Estamos felizes em recebê-lo. Sinta-se em casa.' } },
    ] },
    { id: 'wifi', title: 'Wi-Fi', icon: 'Wifi', blocks: [
      { id: 'w1', type: 'wifi', props: { ssid: 'MinhaRede', password: 'troque-esta-senha' } },
    ] },
    { id: 'checkin', title: 'Check-in', icon: 'Key', blocks: [
      { id: 'c1', type: 'checkin', props: { time: '14:00', address: 'Endereço do imóvel', instructions: 'Instruções de acesso.' } },
    ] },
    { id: 'rules', title: 'Regras', icon: 'ClipboardList', blocks: [
      { id: 'r1', type: 'rules', props: { items: [
        { icon: 'Ban', label: 'Proibido fumar' },
        { icon: 'Moon', label: 'Silêncio após 22h' },
      ] } },
    ] },
    { id: 'guide', title: 'Guia Local', icon: 'MapPin', blocks: [
      { id: 'g1', type: 'guide', props: { places: [
        { name: 'Restaurante exemplo', blurb: 'Comida regional', distance: '300m' },
      ] } },
    ] },
    { id: 'checkout', title: 'Check-out', icon: 'LogOut', blocks: [
      { id: 'o1', type: 'checkout', props: { time: '11:00', items: ['Feche as janelas', 'Deixe a chave na mesa'] } },
    ] },
    { id: 'emergency', title: 'Emergência', icon: 'PhoneCall', blocks: [
      { id: 'e1', type: 'emergency', props: { contacts: [
        { label: 'Polícia', phone: '190' }, { label: 'SAMU', phone: '192' }, { label: 'Bombeiros', phone: '193' },
      ] } },
    ] },
  ],
}

const enxuto: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 'home', title: 'Início', icon: 'Home', blocks: [
      { id: 'h1', type: 'hero', props: { greeting: 'Bem-vindo!', propertyName: 'Meu Apê' } },
    ] },
    { id: 'wifi', title: 'Wi-Fi', icon: 'Wifi', blocks: [
      { id: 'w1', type: 'wifi', props: { ssid: 'MinhaRede', password: 'troque-esta-senha' } },
    ] },
    { id: 'checkin', title: 'Check-in', icon: 'Key', blocks: [
      { id: 'c1', type: 'checkin', props: { time: '14:00', address: 'Endereço do imóvel', instructions: '' } },
    ] },
    { id: 'contato', title: 'Contato', icon: 'MessageCircle', blocks: [
      { id: 'wa1', type: 'whatsapp', props: { number: '' } },
    ] },
  ],
}

const emBranco: PageContent = {
  nav: 'buttons',
  sections: [{ id: 'home', title: 'Início', icon: 'Home', blocks: [] }],
}

export const TEMPLATES = { apeCompleto, enxuto, emBranco } as const
export const DEFAULT_TEMPLATE: PageContent = apeCompleto
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/templates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/templates.ts apps/web/lib/blocks/__tests__/templates.test.ts
git commit -m "feat: starter page templates"
```

---

## Task 3: Add `content` column + read-time fallback query

**Files:**
- Modify: `apps/web/lib/db/schema.ts`
- Create (generated): `apps/web/lib/db/migrations/0002_*.sql` via drizzle-kit
- Create: `apps/web/lib/db/queries.ts`
- Test: `apps/web/lib/db/__tests__/content-fallback.test.ts`

- [ ] **Step 1: Add the column to the Drizzle schema**

In `apps/web/lib/db/schema.ts`, add `jsonb` to the import and a column to `pages` (after `theme`):

```ts
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { PageContent } from '@/lib/blocks/schema'
// ...
  theme:     text('theme').notNull().default('modern'),
  content:   jsonb('content').$type<PageContent>(),
  whatsapp:  text('whatsapp'),
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter web exec drizzle-kit generate`
Expected: a new file `apps/web/lib/db/migrations/0002_*.sql` containing `ALTER TABLE "pages" ADD COLUMN "content" jsonb;` (additive, nullable — reversible via `DROP COLUMN`).

- [ ] **Step 3: Write the failing fallback test**

```ts
// apps/web/lib/db/__tests__/content-fallback.test.ts
import { describe, it, expect } from 'vitest'
import { resolvePageContent } from '../queries'
import { DEFAULT_TEMPLATE } from '@/lib/blocks/templates'

describe('resolvePageContent', () => {
  it('returns stored content when present', () => {
    const stored = { nav: 'onepage' as const, sections: [] }
    expect(resolvePageContent(stored)).toEqual(stored)
  })

  it('falls back to the default template when content is null', () => {
    expect(resolvePageContent(null)).toEqual(DEFAULT_TEMPLATE)
  })

  it('falls back when stored content fails validation', () => {
    expect(resolvePageContent({ nav: 'bogus' } as unknown as null)).toEqual(DEFAULT_TEMPLATE)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter web test -- lib/db/__tests__/content-fallback.test.ts`
Expected: FAIL — cannot resolve `../queries`.

- [ ] **Step 5: Implement the query helpers**

```ts
// apps/web/lib/db/queries.ts
import { eq, and } from 'drizzle-orm'
import { db } from './index'
import { pages } from './schema'
import { pageContentSchema, type PageContent } from '@/lib/blocks/schema'
import { DEFAULT_TEMPLATE } from '@/lib/blocks/templates'

// Lazy backfill: any row without valid content renders the default template.
// Avoids seeding production data inside a migration (see .claude/rules/database.md).
export function resolvePageContent(content: unknown): PageContent {
  const parsed = pageContentSchema.safeParse(content)
  return parsed.success ? parsed.data : DEFAULT_TEMPLATE
}

export async function getPublishedPageBySlug(slug: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.status, 'published')))
    .limit(1)
  if (!page) return null
  return { ...page, content: resolvePageContent(page.content) }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter web test -- lib/db/__tests__/content-fallback.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/db/schema.ts apps/web/lib/db/migrations apps/web/lib/db/queries.ts apps/web/lib/db/__tests__/content-fallback.test.ts
git commit -m "feat: pages.content column + read-time content fallback"
```

---

## Task 4: API accepts and validates `content` on PUT

**Files:**
- Modify: `apps/web/app/api/pages/[id]/route.ts`
- Test: `apps/web/app/api/pages/[id]/__tests__/content-validation.test.ts`

The existing `updateSchema` (lines 8-13) gains an optional `content`. Validation already returns `400 { error: { code: 'VALIDATION', message } }` via the existing `ZodError` branch — reuse it.

- [ ] **Step 1: Write the failing test (pure schema unit — no network)**

```ts
// apps/web/app/api/pages/[id]/__tests__/content-validation.test.ts
import { describe, it, expect } from 'vitest'
import { updateSchema } from '../route'

describe('pages PUT updateSchema', () => {
  it('accepts a valid content tree', () => {
    const r = updateSchema.safeParse({ content: { nav: 'buttons', sections: [] } })
    expect(r.success).toBe(true)
  })

  it('rejects a content tree with a bad nav', () => {
    const r = updateSchema.safeParse({ content: { nav: 'spiral', sections: [] } })
    expect(r.success).toBe(false)
  })

  it('still accepts a title-only update (content optional)', () => {
    const r = updateSchema.safeParse({ title: 'Casa da Praia' })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- app/api/pages/[id]/__tests__/content-validation.test.ts`
Expected: FAIL — `updateSchema` is not exported / `content` unknown.

- [ ] **Step 3: Modify the route**

In `apps/web/app/api/pages/[id]/route.ts`: import the schema, **export** `updateSchema`, add the `content` field. The existing `PUT` body already spreads validated `updates` into `db.update(...).set(...)`, so `content` persists with no further change.

```ts
import { pageContentSchema } from '@/lib/blocks/schema'

export const updateSchema = z.object({
  title:    z.string().min(2).max(100).optional(),
  subtitle: z.string().max(200).optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  theme:    z.enum(['modern', 'rustic']).optional(),
  content:  pageContentSchema.optional(),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- app/api/pages/[id]/__tests__/content-validation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/pages/[id]/route.ts apps/web/app/api/pages/[id]/__tests__/content-validation.test.ts
git commit -m "feat: validate page content on PUT"
```

---

## Task 5: BlockRenderer dispatcher (registry + defensive fallback)

Build the dispatcher first against **stub** block components, then port real visuals in Task 6. This isolates dispatch logic (testable) from styling (visual port).

**Files:**
- Create: `apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/BlockRenderer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/app/[slug]/_components/blocks/__tests__/BlockRenderer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockRenderer } from '../BlockRenderer'
import type { Block } from '@/lib/blocks/schema'

describe('BlockRenderer', () => {
  it('renders a heading block as its text', () => {
    const block: Block = { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } }
    render(<BlockRenderer block={block} ctx={{ whatsapp: null }} />)
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
  })

  it('renders nothing for an unknown block type (defensive)', () => {
    const block = { id: 'b1', type: 'mystery', props: {} } as unknown as Block
    const { container } = render(<BlockRenderer block={block} ctx={{ whatsapp: null }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- app/[slug]/_components/blocks/__tests__/BlockRenderer.test.tsx`
Expected: FAIL — cannot resolve `../BlockRenderer`.

- [ ] **Step 3: Implement dispatcher with stub components**

Create a minimal `HeadingBlock` inline-styled stub now; Task 6 replaces stubs with ported visuals one type at a time. `RenderCtx` carries page-level data (whatsapp) blocks may need.

```tsx
// apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx
import type { Block, BlockType } from '@/lib/blocks/schema'
import type { ComponentType } from 'react'

export interface RenderCtx {
  whatsapp: string | null
}

type BlockComponent = ComponentType<{ block: Block; ctx: RenderCtx }>

function HeadingBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'heading') return null
  const { text, level } = block.props
  const Tag = (`h${level}` as 'h1' | 'h2' | 'h3')
  return <Tag className="font-serif font-bold text-gaccent">{text}</Tag>
}

// Registry grows in Task 6 as each block type's real component is ported.
const REGISTRY: Partial<Record<BlockType, BlockComponent>> = {
  heading: HeadingBlock,
}

export function BlockRenderer({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const Component = REGISTRY[block.type]
  if (!Component) return null // unknown / not-yet-ported → render nothing, never throw
  return <Component block={block} ctx={ctx} />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- app/[slug]/_components/blocks/__tests__/BlockRenderer.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/[slug]/_components/blocks/BlockRenderer.tsx apps/web/app/[slug]/_components/blocks/__tests__/BlockRenderer.test.tsx
git commit -m "feat: BlockRenderer dispatcher with defensive fallback"
```

---

## Task 6: Port the block render components

For **each** block type below: create one component file, add a render test asserting user-visible output, register it in `BlockRenderer`'s `REGISTRY`. The visual JSX is **ported from the existing hardcoded sections** (source noted per block) — copy the relevant markup, replace hardcoded constants with `block.props`. Keep Tailwind classes and `g*` theme tokens unchanged so theming still works.

Do these as **sub-commits**, one block type per commit, repeating the cycle: write render test → run (fail) → port component + register → run (pass) → commit.

**Render-test pattern (reuse for every block, swap the assertion):**

```tsx
// apps/web/app/[slug]/_components/blocks/__tests__/<Type>Block.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockRenderer } from '../BlockRenderer'
import type { Block } from '@/lib/blocks/schema'

describe('<Type>Block', () => {
  it('renders its key prop', () => {
    const block: Block = { /* a valid block of this type */ } as Block
    render(<BlockRenderer block={block} ctx={{ whatsapp: null }} />)
    expect(screen.getByText(/* user-visible value */)).toBeInTheDocument()
  })
})
```

Registry update pattern (per block): add `import { WifiBlock } from './WifiBlock'` and `wifi: WifiBlock,` to `REGISTRY`.

### Per-block port table

| Type | Component file | Port source | Props → markup mapping | Render-test assertion |
|------|----------------|-------------|------------------------|-----------------------|
| `hero` | `HeroBlock.tsx` | `Home.tsx` hero area | `propertyName` → title, `greeting` → subtitle, `imageUrl` → bg `<img>` (skip if absent) | greeting text visible |
| `text` | `TextBlock.tsx` | `Apartment.tsx:26-30` quote block | `text` → `<p className="whitespace-pre-wrap …">` (NO `dangerouslySetInnerHTML`) | text visible |
| `image` | `ImageBlock.tsx` | new (simple) | `url`→`src`, `alt`→`alt`, `caption`→`<figcaption>`; `loading="lazy"`, explicit not required | `alt` queryable via `getByAltText` |
| `button` | `ButtonBlock.tsx` | `CheckOut.tsx` CTA anchors | `kind` maps href: `tel`→`tel:`, `whatsapp`→`https://wa.me/<digits>`, `map`→href as-is, `link`→href; `label` text | label visible, correct `href` |
| `divider` | `DividerBlock.tsx` | new (simple) | `variant==='line'` → `<hr>`; `'spacer'` → `<div className="h-8">` | renders an `<hr>` or spacer (use `data-testid`) |
| `wifi` | `WifiBlock.tsx` | `Apartment.tsx:32-100` Wi-Fi section | `ssid`→network value, `password`→password value + copy + `WIFI:S:${ssid};T:WPA;P:${password};;` QR | ssid visible |
| `checkin` | `CheckInBlock.tsx` | `CheckIn.tsx` | `time`, `address`, `accessCode?`, `instructions` into existing fields | address visible |
| `checkout` | `CheckOutBlock.tsx` | `CheckOut.tsx` | `time` + `items[]` → checklist rows | first item visible |
| `rules` | `RulesBlock.tsx` | `Rules.tsx` | `items[]` `{icon,label}` → icon (via lucide lookup) + label rows | a label visible |
| `guide` | `GuideBlock.tsx` | `LocalGuide.tsx` | `places[]` `{name,blurb,distance?,mapUrl?}` → place cards | a place name visible |
| `emergency` | `EmergencyBlock.tsx` | `Emergency.tsx` | `contacts[]` `{label,phone}` → tap-to-call `tel:` rows | a contact label visible |
| `whatsapp` | `WhatsAppBlock.tsx` | `GuestSite.tsx:181-191` inline WA button | `number` (or `ctx.whatsapp` fallback) → `https://wa.me/<digits>`, `message`→`?text=` | link visible when number present |
| `map` | `MapBlock.tsx` | new (simple) | `query` → `https://www.google.com/maps?q=<encoded>` link/iframe, `label?` | label/query visible |

**Icon lookup helper** (used by `rules` and nav). Create `apps/web/app/[slug]/_components/blocks/icon.tsx`:

```tsx
import * as Lucide from 'lucide-react'
import { HelpCircle, type LucideProps } from 'lucide-react'

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (Lucide as unknown as Record<string, React.ComponentType<LucideProps>>)[name] ?? HelpCircle
  return <Cmp {...props} />
}
```

- [ ] **Step (repeat per row): test → port → register → pass → commit**

Commit message per block: `feat: <type> block renderer`.

After all 13 ported, run the whole blocks folder once:

Run: `pnpm --filter web test -- app/[slug]/_components/blocks`
Expected: PASS (all block tests + dispatcher).

---

## Task 7: Refactor GuestSite to data-driven rendering + nav styles

**Files:**
- Modify: `apps/web/app/[slug]/_components/GuestSite.tsx`
- Modify: `apps/web/app/[slug]/page.tsx`
- Test: `apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx`

`GuestSite` stops importing the 7 fixed section components and the `switch`. It takes `content: PageContent`, renders sections via `BlockRenderer`, and switches nav by `content.nav`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GuestSite } from '../GuestSite'
import type { PageContent } from '@/lib/blocks/schema'

const content: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 'home', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } } ] },
    { id: 'wifi', title: 'Wi-Fi', icon: 'Wifi', blocks: [
      { id: 'b2', type: 'wifi', props: { ssid: 'NetX', password: 'p' } } ] },
  ],
}

describe('GuestSite (button nav)', () => {
  it('renders a persistent nav button for every section', () => {
    render(<GuestSite title="Casa" whatsapp={null} theme="modern" content={content} />)
    expect(screen.getByRole('button', { name: /Wi-Fi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Início/i })).toBeInTheDocument()
  })

  it('shows the active section content on first render', () => {
    render(<GuestSite title="Casa" whatsapp={null} theme="modern" content={content} />)
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- app/[slug]/_components/__tests__/GuestSite.test.tsx`
Expected: FAIL — `GuestSite` prop `content` does not exist / old signature.

- [ ] **Step 3: Refactor GuestSite**

Replace the section `switch` and fixed `MENU_ITEMS` import. New behavior:

- Props: `{ title: string; whatsapp: string | null; theme: string; content: PageContent }`.
- `ctx: RenderCtx = { whatsapp }`.
- A `SectionView` renders one section: `section.blocks.map(b => <BlockRenderer key={b.id} block={b} ctx={ctx} />)`.
- **`content.nav === 'buttons'`**: keep one `activeSectionId` in state. Render a **persistent** nav bar (port the existing sticky header styling) with one `<button>` per `section` (label `section.title`, icon via `<Icon name={section.icon} />`) that sets `activeSectionId`. The bar renders on every section — there is no "return home to navigate" step. Render only the active section's `SectionView`. Keep the existing QR + WhatsApp floating button (now reading `ctx.whatsapp`). Remove the old `ChevronLeft`/home-only logic.
- **`content.nav === 'onepage'`**: render **all** sections stacked, each in `<section id={section.id}>`; the nav bar links (`<a href={'#'+id}>`) smooth-scroll. Keep it sticky.
- Keep `data-theme={theme}` wrapper and footer.

Delete the now-unused imports of `Home/Apartment/CheckIn/Rules/LocalGuide/CheckOut/Emergency` and `MENU_ITEMS`/`GuestSection`. (The old section component files and `guest-data.tsx` may stay in the tree until Plan B removes them; do not delete in this task to keep the diff focused — but stop importing them.)

- [ ] **Step 4: Update the page to pass content**

In `apps/web/app/[slug]/page.tsx`, fetch via the new query and pass `content`:

```tsx
import { getPublishedPageBySlug } from '@/lib/db/queries'
// ...
const page = await getPublishedPageBySlug(slug)
if (!page) notFound()
return <GuestSite title={page.title} whatsapp={page.whatsapp} theme={page.theme} content={page.content} />
```

(If `page.tsx` currently queries inline, replace that query with `getPublishedPageBySlug`. Preserve existing `notFound()` / metadata behavior.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter web test -- app/[slug]/_components/__tests__/GuestSite.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck + full web test run**

Run: `pnpm typecheck`
Expected: no errors.
Run: `pnpm --filter web test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/[slug]
git commit -m "feat: data-driven GuestSite with button + one-page nav"
```

---

## Task 8: Manual verification + migration apply

- [ ] **Step 1: Apply the migration to the dev database**

Run: `pnpm --filter web exec drizzle-kit migrate`
Expected: `0002` applied; `pages.content` exists.

- [ ] **Step 2: Verify an existing published page still renders**

Start dev (`pnpm dev`), open an existing `/<slug>`. Expected: page renders the default template (lazy backfill) with a persistent button nav; tapping nav swaps sections without returning home. No console errors.

- [ ] **Step 3: Verify one-page nav**

Temporarily set a row's `content` (via `drizzle-kit studio`) to a tree with `nav: 'onepage'`. Reload `/<slug>`. Expected: sections stacked, nav links smooth-scroll.

- [ ] **Step 4: Commit any fixes, then finish the branch**

Use superpowers:finishing-a-development-branch to merge/PR `feat/page-builder` (Plan A slice).

---

## Self-Review (completed by author)

- **Spec coverage:** block-stack model (Tasks 1,5–7) ✓; JSONB + shared Zod (Tasks 1,3) ✓; button + one-page nav (Task 7) ✓; core block catalog (Task 6, 13 types) ✓; shared renderers used by guest page (Tasks 5–7; builder reuse comes in Plan B) ✓; templates as seed JSON (Task 2) ✓; backfill for existing rows (Task 3, lazy) ✓; image URL-only (Task 6 `image`) ✓; error handling 400 on bad content (Task 4) ✓; defensive renderer (Task 5) ✓. **Builder UI (3-pane), autosave/publish, undo = Plan B (out of scope here).**
- **Deviations from spec (intentional, noted in body):** types in `apps/web/lib/blocks/` not `packages/types` (no workspace exists); `text` block stores plain text not HTML (XSS); backfill is read-time not a seeding migration (db rules); API verb is PUT not PATCH (existing handler).
- **Placeholder scan:** none — every code step has full code; Task 6 ports from named existing files with explicit prop maps.
- **Type consistency:** `PageContent`, `Block`, `Section`, `BlockType`, `RenderCtx`, `resolvePageContent`, `updateSchema`, `getPublishedPageBySlug`, `BlockRenderer` used consistently across tasks.
