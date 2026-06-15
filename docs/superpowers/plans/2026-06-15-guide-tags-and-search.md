# Guide Tags + Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the guide block per-place tags with a chip filter, and add a global search overlay that indexes the current page's content and jumps to the matching section.

**Architecture:** D1 — `guide.places[].tags: string[]`, edited via a new `'tags'` inspector field kind (comma text ⇄ array); `GuideBlock` becomes a client component with a tag chip filter. D2 — a pure `searchContent(content, query)` helper builds results from the block tree; a `SearchOverlay` renders them; `GuestSite` adds a header search button and navigates (switch section / scroll).

**Tech Stack:** Next.js 16, React 19, Zod v4, Tailwind v4, lucide-react, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-06-15-guide-tags-and-search-design.md`. Branch: `feat/guide-search`.

**Conventions:**
- Tests: `pnpm --filter web test -- <path>`; group renders with `--no-file-parallelism`. `@/` = `apps/web/`.
- Run `pnpm typecheck` before each commit. Test fixtures: type as `Block`/`PageContent`, never `as const` (readonly breaks the mutable types).
- Commit after each task. Ignore the `.bashrc` `$'...export'` warning.

---

## Task 1: Guide tags — schema, field kind, inspector

**Files:**
- Modify: `apps/web/lib/blocks/schema.ts`, `apps/web/lib/blocks/defaults.ts`, `apps/web/lib/blocks/fields.ts`, `apps/web/app/(app)/app/[id]/edit/_builder/Inspector.tsx`
- Test: `apps/web/lib/blocks/__tests__/guide-tags.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — create `guide-tags.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { createBuilderStore } from '@/app/(app)/app/[id]/edit/_builder/store'
import { Inspector } from '@/app/(app)/app/[id]/edit/_builder/Inspector'
import type { PageContent } from '@/lib/blocks/schema'

describe('guide tags', () => {
  it('parses a guide place with tags', () => {
    const r = blockSchema.safeParse({ id: 'g1', type: 'guide', props: { places: [
      { name: 'Bistrô', blurb: '', tags: ['praia', 'comida'] } ] } })
    expect(r.success).toBe(true)
  })

  it('edits tags as comma-separated text through the inspector', () => {
    const content: PageContent = { nav: 'buttons', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'g1', type: 'guide', props: { places: [{ name: 'Bistrô', blurb: '', tags: [] }] } } ] } ] }
    const store = createBuilderStore(content)
    store.getState().selectBlock('g1')
    render(<Inspector store={store} />)
    fireEvent.change(screen.getByLabelText('Tags (vírgula)'), { target: { value: 'praia, comida ,' } })
    const place = (store.getState().content.sections[0].blocks[0].props as { places: { tags: string[] }[] }).places[0]
    expect(place.tags).toEqual(['praia', 'comida'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/guide-tags.test.tsx`
Expected: FAIL — no `Tags (vírgula)` field rendered.

- [ ] **Step 3: Implement**

In `schema.ts`, the guide place object gains `tags`:

```ts
export const guideBlock = z.object({ ...base, type: z.literal('guide'),
  props: z.object({ places: z.array(z.object({
    name: z.string(), blurb: z.string().default(''), distance: z.string().optional(), mapUrl: optionalUrl,
    tags: z.array(z.string()).default([]),
  })).default([]) }) })
```

In `defaults.ts`, update the guide default place to include `tags`:

```ts
  guide:     { places: [{ name: 'Lugar', blurb: '', tags: [] }] },
```

In `fields.ts`:
- Extend `FieldKind`: `export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'list' | 'icon' | 'tags'`
- Add the tags itemField to `BLOCK_FIELDS.guide`'s `places` itemFields (append after `mapUrl`):

```ts
      { key: 'tags', label: 'Tags (vírgula)', kind: 'tags' } ] },
```

In `Inspector.tsx`, inside the list non-scalar `itemFields.map((subField) => { ... })` (right after the existing `if (subField.kind === 'icon') { ... }` block), add:

```tsx
                    if (subField.kind === 'tags') {
                      const arr = Array.isArray(subVal) ? (subVal as string[]) : []
                      return (
                        <div key={subField.key} className="flex flex-col gap-0.5">
                          <label htmlFor={subId} className="text-xs text-muted-foreground">{subField.label}</label>
                          <input
                            id={subId}
                            className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={arr.join(', ')}
                            aria-label={subField.label}
                            onChange={(e) => {
                              const next = [...items]
                              next[i] = { ...(obj as object), [subField.key]: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }
                              setItems(next)
                            }}
                          />
                        </div>
                      )
                    }
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/guide-tags.test.tsx` then `pnpm typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/schema.ts apps/web/lib/blocks/defaults.ts apps/web/lib/blocks/fields.ts "apps/web/app/(app)/app/[id]/edit/_builder/Inspector.tsx" apps/web/lib/blocks/__tests__/guide-tags.test.tsx
git commit -m "feat: guide place tags + tags inspector field kind"
```

---

## Task 2: Guide tag filter (renderer)

**Files:**
- Modify: `apps/web/app/[slug]/_components/blocks/GuideBlock.tsx`
- Test: `apps/web/app/[slug]/_components/blocks/__tests__/guide-filter.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — create `guide-filter.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuideBlock } from '../GuideBlock'
import type { Block } from '@/lib/blocks/schema'

const guide = (): Block => ({ id: 'g1', type: 'guide', props: { places: [
  { name: 'Bistrô', blurb: '', tags: ['comida'] },
  { name: 'Praia Central', blurb: '', tags: ['praia'] },
  { name: 'Quiosque', blurb: '', tags: ['praia', 'comida'] },
] } })

describe('guide filter', () => {
  it('filters places by the selected tag (multi-tag place shows under each)', () => {
    render(<GuideBlock block={guide()} ctx={{ whatsapp: null }} />)
    fireEvent.click(screen.getByRole('button', { name: 'praia' }))
    expect(screen.getByText('Praia Central')).toBeInTheDocument()
    expect(screen.getByText('Quiosque')).toBeInTheDocument()
    expect(screen.queryByText('Bistrô')).not.toBeInTheDocument()
  })

  it('renders no chip bar when no place has tags', () => {
    const noTags: Block = { id: 'g2', type: 'guide', props: { places: [{ name: 'X', blurb: '', tags: [] }] } }
    render(<GuideBlock block={noTags} ctx={{ whatsapp: null }} />)
    expect(screen.queryByRole('button', { name: 'Tudo' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/guide-filter.test.tsx"`
Expected: FAIL — no chip buttons exist.

- [ ] **Step 3: Implement** — replace the ENTIRE contents of `GuideBlock.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

function chipClass(active: boolean): string {
  return `px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all border ${
    active ? 'bg-gaccent text-gsecondary border-gaccent shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
  }`
}

export function GuideBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'guide') return null
  const { places } = block.props
  const [selected, setSelected] = useState<string | null>(null)

  const allTags = Array.from(new Set(places.flatMap((p) => p.tags)))
  const shown = selected ? places.filter((p) => p.tags.includes(selected)) : places

  return (
    <div className="p-6 animate-fadeIn">
      {allTags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button type="button" onClick={() => setSelected(null)} className={chipClass(selected === null)}>Tudo</button>
          {allTags.map((tag) => (
            <button key={tag} type="button" onClick={() => setSelected(tag)} className={chipClass(selected === tag)}>{tag}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((place, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-center justify-between group hover:border-gsecondary/30 transition-all"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="bg-gsurface text-gaccent p-3 rounded-xl shrink-0">
                <MapPin size={18} />
              </div>
              <div className="min-w-0 pr-2">
                <h4 className="font-bold text-gaccent text-sm leading-tight">{place.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{place.blurb}</p>
                {place.distance && <p className="text-[11px] text-gray-400 mt-0.5">{place.distance}</p>}
                {place.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {place.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gsurface text-gaccent text-[9px] font-black uppercase tracking-wider rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {place.mapUrl && (
              <a
                href={place.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gaccent text-gsecondary p-3 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all hover:bg-gaccent-strong shrink-0"
                aria-label={`Abrir ${place.name} no mapa`}
              >
                <MapPin size={20} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/blocks/__tests__/guide-filter.test.tsx"` then `pnpm typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/blocks/GuideBlock.tsx" "apps/web/app/[slug]/_components/blocks/__tests__/guide-filter.test.tsx"
git commit -m "feat: guide tag chip filter + tag badges"
```

---

## Task 3: `searchContent` helper

**Files:**
- Create: `apps/web/lib/blocks/search.ts`
- Test: `apps/web/lib/blocks/__tests__/search.test.ts`

- [ ] **Step 1: Write the failing test** — create `search.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { searchContent } from '../search'
import type { PageContent } from '../schema'

const content: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Café da manhã', level: 2 } },
    { id: 'b2', type: 'wifi', props: { ssid: 'CasaRede', password: 'x' } } ] },
  { id: 's2', title: 'Guia', icon: 'Map', blocks: [
    { id: 'b3', type: 'guide', props: { places: [{ name: 'Bistrô do Sol', blurb: '', tags: [] }] } } ] },
] }

describe('searchContent', () => {
  it('returns [] for an empty query', () => {
    expect(searchContent(content, '   ')).toEqual([])
  })
  it('finds a heading and reports its section', () => {
    const r = searchContent(content, 'café')
    expect(r[0].sectionId).toBe('s1')
    expect(r[0].snippet).toBe('Café da manhã')
  })
  it('is accent-insensitive', () => {
    expect(searchContent(content, 'cafe').length).toBeGreaterThan(0)
  })
  it('finds a wifi by ssid', () => {
    expect(searchContent(content, 'casarede')[0].sectionId).toBe('s1')
  })
  it('finds a guide place by name in its section', () => {
    expect(searchContent(content, 'bistrô')[0].sectionId).toBe('s2')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/search.test.ts`
Expected: FAIL — cannot resolve `../search`.

- [ ] **Step 3: Implement** — create `apps/web/lib/blocks/search.ts`:

```ts
import type { Block, PageContent } from './schema'
import { BLOCK_META } from './fields'

export interface SearchEntry {
  sectionId: string
  sectionTitle: string
  blockType: string
  snippet: string
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function blockStrings(block: Block): string[] {
  switch (block.type) {
    case 'heading': return [block.props.text]
    case 'text': return [block.props.text]
    case 'callout': return [block.props.text]
    case 'hero': return [block.props.greeting, block.props.propertyName]
    case 'button': return [block.props.label]
    case 'wifi': return [block.props.ssid, 'Wi-Fi']
    case 'checkin': return [block.props.address, block.props.instructions]
    case 'checkout': return block.props.items
    case 'rules': return block.props.items.map((i) => i.label)
    case 'guide': return block.props.places.flatMap((p) => [p.name, p.blurb, ...p.tags])
    case 'emergency': return block.props.contacts.map((c) => c.label)
    case 'accordion': return block.props.items.flatMap((i) => [i.title, i.summary, i.body])
    case 'linkcard': return [block.props.title, block.props.text, ...block.props.links.map((l) => l.label)]
    case 'map': return [block.props.query, block.props.label ?? '']
    case 'image': return [block.props.alt, block.props.caption ?? '']
    case 'carousel': return block.props.images.flatMap((im) => [im.alt, im.caption ?? ''])
    default: return []
  }
}

export function searchContent(content: PageContent, query: string): SearchEntry[] {
  const q = normalize(query.trim())
  if (!q) return []
  const out: SearchEntry[] = []
  for (const section of content.sections) {
    for (const block of section.blocks) {
      for (const raw of blockStrings(block)) {
        const s = (raw ?? '').toString().trim()
        if (s && normalize(s).includes(q)) {
          out.push({ sectionId: section.id, sectionTitle: section.title, blockType: BLOCK_META[block.type].label, snippet: s })
          if (out.length >= 10) return out
          break // at most one entry per block
        }
      }
    }
  }
  return out
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/search.test.ts` then `pnpm typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/search.ts apps/web/lib/blocks/__tests__/search.test.ts
git commit -m "feat: searchContent helper indexing the page block tree"
```

---

## Task 4: SearchOverlay component

**Files:**
- Replace: `apps/web/app/[slug]/_components/SearchOverlay.tsx` (overwrite the orphaned old file)
- Test: `apps/web/app/[slug]/_components/__tests__/SearchOverlay.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — create `SearchOverlay.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchOverlay } from '../SearchOverlay'
import type { PageContent } from '@/lib/blocks/schema'

const content: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Café da manhã', level: 2 } } ] } ] }

describe('SearchOverlay', () => {
  it('navigates to the matched section when a result is clicked', () => {
    const onNavigate = vi.fn()
    render(<SearchOverlay content={content} onNavigate={onNavigate} onClose={() => {}} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'café' } })
    fireEvent.click(screen.getByText('Café da manhã'))
    expect(onNavigate).toHaveBeenCalledWith('s1')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/SearchOverlay.test.tsx"`
Expected: FAIL — the new `SearchOverlay` signature/exports don't match (old one imports `guest-data`).

- [ ] **Step 3: Implement** — replace the ENTIRE contents of `apps/web/app/[slug]/_components/SearchOverlay.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { Search as SearchIcon, ChevronRight } from 'lucide-react'
import type { PageContent } from '@/lib/blocks/schema'
import { searchContent } from '@/lib/blocks/search'

interface SearchOverlayProps {
  content: PageContent
  onNavigate: (sectionId: string) => void
  onClose: () => void
}

export function SearchOverlay({ content, onNavigate, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const results = searchContent(content, query)
  const trimmed = query.trim()

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white animate-fadeIn">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="O que você procura?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl bg-gray-50 py-3 pl-10 pr-4 text-gaccent-strong outline-none focus:ring-2 focus:ring-gsecondary"
          />
        </div>
        <button onClick={onClose} className="px-2 text-sm font-bold text-gaccent">Fechar</button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {!trimmed ? (
          <p className="pt-10 text-center text-sm text-gray-400">Digite para pesquisar na página</p>
        ) : results.length === 0 ? (
          <p className="pt-10 text-center text-sm text-gray-400">Nenhum resultado para &ldquo;{query}&rdquo;</p>
        ) : (
          results.map((r, idx) => (
            <button
              key={idx}
              onClick={() => { onNavigate(r.sectionId); onClose() }}
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-50 bg-white p-4 text-left shadow-sm hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-gaccent">{r.snippet}</h4>
                <p className="mt-0.5 text-[11px] text-gray-400">{r.blockType} · {r.sectionTitle}</p>
              </div>
              <ChevronRight size={18} className="text-gray-200" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/SearchOverlay.test.tsx"` then `pnpm typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/SearchOverlay.tsx" "apps/web/app/[slug]/_components/__tests__/SearchOverlay.test.tsx"
git commit -m "feat: data-driven SearchOverlay (replaces orphaned demo version)"
```

---

## Task 5: Wire search into GuestSite

**Files:**
- Modify: `apps/web/app/[slug]/_components/GuestSite.tsx`
- Test: `apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx` (append)

- [ ] **Step 1: Write the failing test** — append to `GuestSite.test.tsx`:

```ts
it('opens the search overlay from the header button', () => {
  const content: PageContent = { nav: 'buttons', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
  render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
  expect(screen.queryByPlaceholderText('O que você procura?')).not.toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Buscar na página'))
  expect(screen.getByPlaceholderText('O que você procura?')).toBeInTheDocument()
})
```

(`screen`/`fireEvent` are imported in this file; add them to the `@testing-library/react` import if missing.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/GuestSite.test.tsx"`
Expected: FAIL — no search button.

- [ ] **Step 3: Implement** — in `GuestSite.tsx`:

(a) Add imports: extend the lucide import to include `Search`, and import the overlay:

```ts
import { X, MessageCircle, QrCode, Search } from 'lucide-react'
import { SearchOverlay } from './SearchOverlay'
```

(b) Add state near the other `useState`s:

```ts
  const [isSearchOpen, setIsSearchOpen] = useState(false)
```

(c) Add the navigate handler (after `activeSection` is computed):

```ts
  const handleSearchNavigate = (sectionId: string) => {
    setActiveSectionId(sectionId)
    if (!isButtonsNav) {
      requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' }))
    }
  }
```

(d) In the header's title/QR row, add a search button before the QR button:

```tsx
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-full transition-colors text-gaccent hover:bg-teal-50 shrink-0"
            aria-label="Buscar na página"
          >
            <Search size={24} />
          </button>
```

(Place it inside the existing `flex items-center` group that holds the QR button — wrap both in that group if the QR button is currently alone.)

(e) Render the overlay near the QR dialog block:

```tsx
      {isSearchOpen && (
        <SearchOverlay
          content={content}
          onNavigate={handleSearchNavigate}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/GuestSite.test.tsx"` then `pnpm typecheck`
Expected: PASS (existing + new) + clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/GuestSite.tsx" "apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx"
git commit -m "feat: header search button + overlay wiring in GuestSite"
```

---

## Task 6: Full check + manual verification

- [ ] **Step 1: Typecheck + targeted tests**

Run: `pnpm typecheck`
Expected: clean.
Run: `pnpm --filter web test -- lib/blocks "app/[slug]/_components" "app/(app)/app/[id]/edit/_builder" --no-file-parallelism`
Expected: all green.

- [ ] **Step 2: Manual verification (`pnpm dev`)**

- Builder: select a guide block → each place has a "Tags (vírgula)" field; type `praia, comida`. Save.
- Guest `/<slug>`: the guide shows tag chips (Tudo + praia + comida); clicking a chip filters; a place with both tags appears under each; cards show tag badges.
- Guest header: a search icon opens the overlay; typing a word (e.g. a heading or wifi name) lists results with block-type + section; clicking jumps to that section (switches tab in buttons-nav, scrolls in one-page).
- A guide with no tags shows no chip bar; an unrelated query shows "Nenhum resultado".

- [ ] **Step 3: Finish the branch**

Use superpowers:finishing-a-development-branch.

---

## Self-Review (completed by author)

- **Spec coverage:** guide tags schema + `'tags'` field kind + inspector (Task 1 ✓); guide chip filter + badges, multi-tag, no-tags hides bar (Task 2 ✓); `searchContent` pure indexer across all block types, accent-insensitive, capped (Task 3 ✓); data-driven `SearchOverlay` replacing the orphan (Task 4 ✓); header button + section navigation switch/scroll (Task 5 ✓). Out-of-scope (Waze, fuzzy, keyboard shortcut, cross-page) excluded.
- **Placeholder scan:** none — every renderer/helper is given in full.
- **Type consistency:** `tags: string[]` on the guide place flows through `defaults` (default place includes `tags: []`, required by the exhaustive `DEFAULT_PROPS` output type), `BLOCK_FIELDS` (`kind: 'tags'`), the Inspector branch (writes `string[]`), `GuideBlock` (reads `p.tags`), and `searchContent` (`...p.tags`). `searchContent(content, query): SearchEntry[]`, `SearchOverlay` props `{ content, onNavigate, onClose }`, and the GuestSite handler all agree. Fixtures typed as `Block`/`PageContent` (no `as const`).
- **Note:** `blockStrings` switches on the discriminated `block.type`, so each `block.props` access is type-narrowed (no `any`). New block types added later won't break it (the `default` returns `[]`), but they also won't be searchable until a case is added — acceptable for v1.
```
