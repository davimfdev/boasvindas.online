# Page Builder — Plan B: 3-Pane Builder UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give clients a 3-pane builder (block palette + live phone preview + inspector) to assemble and edit a guest page's content tree, autosaving to the existing `pages.content` JSONB and reusing the Plan A block renderers for a pixel-identical preview.

**Architecture:** A full-page authenticated route `/(app)/app/[id]/edit` loads the owned page server-side and hands its content to a client `<Builder>`. A Zustand store holds the editable content tree (sections/blocks), selection, and undo/redo; all mutations are pure store actions (unit-tested). The palette adds blocks via a `createBlock` factory; the inspector renders editable fields from a declarative per-type field config; the preview renders the live tree through Plan A's `<BlockRenderer>` wrapped with selection/drag affordances (`@dnd-kit` sortable). A debounced autosave hook PUTs `{ content }` to the existing `/api/pages/[id]` (which already validates with `pageContentSchema`).

**Tech Stack:** Next.js 16 (App Router), React 19, Zustand, @dnd-kit (core + sortable + utilities), Zod v4, Vitest 4, Tailwind v4, shadcn/ui (`@/components/ui/*`), lucide-react. New deps to add: `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

**Spec:** `docs/superpowers/specs/2026-06-14-page-builder-design.md`. **Builds on Plan A** (merged): block schema/types, `BlockRenderer`, `Icon`, templates, `pages.content` column, API content validation.

**Conventions:**
- Tests: `pnpm --filter web test -- <path>`. Run the single file after changes.
- `@/` alias = `apps/web/` root. shadcn components at `@/components/ui/*` (Button, Input, Label, Dialog, Badge exist; check for Select/Switch/Textarea at impl time — fall back to native + existing styles if absent).
- New IDs use `crypto.randomUUID()` (built-in; no `nanoid` dependency).
- Commit after each task with the message shown.

**v1 scope decisions (intentional):**
- All block props are edited in the **inspector**; the preview reflects changes live and highlights the selected block. Inline contenteditable-on-canvas is deferred (first follow-up).
- DnD covers: **drag a palette item into the preview** to add a block at a drop position, and **reorder blocks within the active section**. Cross-section drag is deferred; moving a block between sections in v1 is done by delete + re-add. Sections are added/renamed/reordered/deleted via controls (no section drag in v1).
- Builder edits the **draft** content; saving writes `content` and is independent of publish status (existing `PublishToggle` unchanged).
- Image blocks: paste URL only (Plan A constraint).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/web/lib/blocks/defaults.ts` | `createBlock(type)` / `createSection()` factories returning schema-valid defaults with fresh ids. |
| `apps/web/lib/blocks/__tests__/defaults.test.ts` | Every created block/section parses against the schema. |
| `apps/web/lib/blocks/fields.ts` | `BLOCK_FIELDS`: declarative editable-field descriptors per block type (drives the inspector). `BLOCK_META`: label + group + icon per type (drives the palette). |
| `apps/web/lib/blocks/__tests__/fields.test.ts` | Every block type has meta + fields; field keys exist on that block's props. |
| `apps/web/app/(app)/app/[id]/edit/_builder/store.ts` | Zustand store: content tree, selection, dirty flag, undo/redo, pure actions. |
| `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts` | Store action behavior (add/update/remove/move/sections/nav/undo/redo). |
| `apps/web/app/(app)/app/[id]/edit/_builder/useAutosave.ts` | Debounced PUT of `content`; status (`idle`/`saving`/`saved`/`error`). |
| `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/useAutosave.test.ts` | Debounce + payload + status transitions (mocked fetch + fake timers). |
| `apps/web/app/(app)/app/[id]/edit/_builder/Palette.tsx` | Left pane: grouped, draggable + click-to-add block buttons. |
| `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx` | Center pane: phone frame, sortable block list via `BlockRenderer`, selection. |
| `apps/web/app/(app)/app/[id]/edit/_builder/Inspector.tsx` | Right pane: fields for the selected block from `BLOCK_FIELDS`. |
| `apps/web/app/(app)/app/[id]/edit/_builder/SectionTabs.tsx` | Section add/rename/reorder/delete + active-section switch + nav-style toggle. |
| `apps/web/app/(app)/app/[id]/edit/_builder/Builder.tsx` | Client shell: 3-pane layout, DndContext, save-status bar, wires store + autosave. |
| `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/*.test.tsx` | Render/integration tests per component. |
| `apps/web/app/(app)/app/[id]/edit/page.tsx` | Server route: auth + ownership, load page, render `<Builder>`. |
| `apps/web/app/(app)/app/_components/EditPageDialog.tsx` | (modify) keep meta editing; add a "Construir" link to the builder. |

---

## Task 1: Add builder dependencies

**Files:** `apps/web/package.json` (modify, via package manager)

- [ ] **Step 1: Install**

Run from repo root:
```bash
pnpm --filter web add zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify install + types resolve**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors (no usage yet; this just confirms the install didn't break types).

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add builder deps (zustand, dnd-kit)"
```

---

## Task 2: Block + section factories

**Files:**
- Create: `apps/web/lib/blocks/defaults.ts`
- Test: `apps/web/lib/blocks/__tests__/defaults.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { blockSchema, sectionSchema, type BlockType } from '../schema'
import { createBlock, createSection, BLOCK_TYPES } from '../defaults'

describe('createBlock', () => {
  it.each(BLOCK_TYPES)('creates a schema-valid %s block with a fresh id', (type) => {
    const block = createBlock(type as BlockType)
    expect(block.id).toBeTruthy()
    expect(blockSchema.safeParse(block).success).toBe(true)
    expect(block.type).toBe(type)
  })

  it('gives two blocks different ids', () => {
    expect(createBlock('text').id).not.toBe(createBlock('text').id)
  })
})

describe('createSection', () => {
  it('creates a schema-valid section with one default-ish title and no blocks', () => {
    const s = createSection()
    expect(s.id).toBeTruthy()
    expect(sectionSchema.safeParse(s).success).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/defaults.test.ts`
Expected: FAIL — cannot resolve `../defaults`.

- [ ] **Step 3: Implement**

```ts
import type { Block, BlockType, Section } from './schema'

export const BLOCK_TYPES = [
  'heading', 'text', 'image', 'button', 'divider',
  'wifi', 'checkin', 'checkout', 'rules', 'guide',
  'emergency', 'hero', 'whatsapp', 'map',
] as const satisfies readonly BlockType[]

const id = () => crypto.randomUUID()

const DEFAULT_PROPS: { [T in BlockType]: Extract<Block, { type: T }>['props'] } = {
  heading:   { text: 'Novo título', level: 2 },
  text:      { text: 'Escreva aqui…' },
  image:     { url: 'https://placehold.co/800x400', alt: '' },
  button:    { label: 'Botão', href: 'https://', kind: 'link' },
  divider:   { variant: 'line' },
  wifi:      { ssid: 'MinhaRede', password: 'troque-a-senha' },
  checkin:   { time: '14:00', address: 'Endereço do imóvel', instructions: '' },
  checkout:  { time: '11:00', items: ['Feche as janelas'] },
  rules:     { items: [{ icon: 'Ban', label: 'Proibido fumar' }] },
  guide:     { places: [{ name: 'Lugar', blurb: '' }] },
  emergency: { contacts: [{ label: 'Polícia', phone: '190' }] },
  hero:      { greeting: 'Seja bem-vindo!', propertyName: 'Meu imóvel' },
  whatsapp:  { number: '' },
  map:       { query: 'Endereço do imóvel' },
}

export function createBlock(type: BlockType): Block {
  return { id: id(), type, props: structuredClone(DEFAULT_PROPS[type]) } as Block
}

export function createSection(title = 'Nova seção'): Section {
  return { id: id(), title, icon: 'LayoutGrid', blocks: [] }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/defaults.test.ts`
Expected: PASS (15 it.each cases + 2 = 17).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/defaults.ts apps/web/lib/blocks/__tests__/defaults.test.ts
git commit -m "feat: block + section factory defaults"
```

---

## Task 3: Inspector field config + palette meta

**Files:**
- Create: `apps/web/lib/blocks/fields.ts`
- Test: `apps/web/lib/blocks/__tests__/fields.test.ts`

`BLOCK_FIELDS` describes the editable fields the inspector renders for each block type. `BLOCK_META` gives the palette its label/group/icon. Field kinds kept minimal for v1: `text`, `textarea`, `number`, `select`, and `list` (an editable array of sub-objects).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { BLOCK_FIELDS, BLOCK_META } from '../fields'
import { BLOCK_TYPES, createBlock } from '../defaults'

describe('block field config', () => {
  it.each(BLOCK_TYPES)('%s has palette meta (label + group + icon)', (type) => {
    const meta = BLOCK_META[type]
    expect(meta?.label).toBeTruthy()
    expect(meta?.group).toBeTruthy()
    expect(meta?.icon).toBeTruthy()
  })

  it.each(BLOCK_TYPES)('%s field keys all exist on the default block props', (type) => {
    const props = createBlock(type).props as Record<string, unknown>
    for (const field of BLOCK_FIELDS[type]) {
      expect(props).toHaveProperty(field.key)
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/fields.test.ts`
Expected: FAIL — cannot resolve `../fields`.

- [ ] **Step 3: Implement**

```ts
import type { BlockType } from './schema'

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'list'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  options?: { value: string; label: string }[]   // for kind: 'select'
  itemFields?: { key: string; label: string; kind: FieldKind }[]  // for kind: 'list'
}

export const BLOCK_META: Record<BlockType, { label: string; group: 'Básico' | 'Hospedagem' | 'Utilidades'; icon: string }> = {
  heading:   { label: 'Título',        group: 'Básico',      icon: 'Heading' },
  text:      { label: 'Texto',         group: 'Básico',      icon: 'Type' },
  image:     { label: 'Imagem',        group: 'Básico',      icon: 'Image' },
  button:    { label: 'Botão',         group: 'Básico',      icon: 'MousePointerClick' },
  divider:   { label: 'Divisor',       group: 'Básico',      icon: 'Minus' },
  hero:      { label: 'Capa',          group: 'Hospedagem',  icon: 'PanelTop' },
  wifi:      { label: 'Wi-Fi',         group: 'Hospedagem',  icon: 'Wifi' },
  checkin:   { label: 'Check-in',      group: 'Hospedagem',  icon: 'Key' },
  checkout:  { label: 'Check-out',     group: 'Hospedagem',  icon: 'LogOut' },
  rules:     { label: 'Regras',        group: 'Hospedagem',  icon: 'ClipboardList' },
  guide:     { label: 'Guia Local',    group: 'Hospedagem',  icon: 'MapPin' },
  emergency: { label: 'Emergência',    group: 'Hospedagem',  icon: 'PhoneCall' },
  whatsapp:  { label: 'WhatsApp',      group: 'Utilidades',  icon: 'MessageCircle' },
  map:       { label: 'Mapa',          group: 'Utilidades',  icon: 'Map' },
}

export const BLOCK_FIELDS: Record<BlockType, FieldDef[]> = {
  heading: [
    { key: 'text', label: 'Texto', kind: 'text' },
    { key: 'level', label: 'Nível', kind: 'select', options: [
      { value: '1', label: 'H1' }, { value: '2', label: 'H2' }, { value: '3', label: 'H3' } ] },
  ],
  text: [{ key: 'text', label: 'Texto', kind: 'textarea' }],
  image: [
    { key: 'url', label: 'URL da imagem', kind: 'text' },
    { key: 'alt', label: 'Descrição (alt)', kind: 'text' },
    { key: 'caption', label: 'Legenda', kind: 'text' },
  ],
  button: [
    { key: 'label', label: 'Rótulo', kind: 'text' },
    { key: 'href', label: 'Destino', kind: 'text' },
    { key: 'kind', label: 'Tipo', kind: 'select', options: [
      { value: 'link', label: 'Link' }, { value: 'tel', label: 'Telefone' },
      { value: 'whatsapp', label: 'WhatsApp' }, { value: 'map', label: 'Mapa' } ] },
  ],
  divider: [{ key: 'variant', label: 'Estilo', kind: 'select', options: [
    { value: 'line', label: 'Linha' }, { value: 'spacer', label: 'Espaço' } ] }],
  hero: [
    { key: 'propertyName', label: 'Nome do imóvel', kind: 'text' },
    { key: 'greeting', label: 'Saudação', kind: 'text' },
    { key: 'imageUrl', label: 'Imagem de capa (URL)', kind: 'text' },
  ],
  wifi: [
    { key: 'ssid', label: 'Rede (SSID)', kind: 'text' },
    { key: 'password', label: 'Senha', kind: 'text' },
  ],
  checkin: [
    { key: 'time', label: 'Horário', kind: 'text' },
    { key: 'address', label: 'Endereço', kind: 'text' },
    { key: 'accessCode', label: 'Código de acesso', kind: 'text' },
    { key: 'instructions', label: 'Instruções', kind: 'textarea' },
  ],
  checkout: [
    { key: 'time', label: 'Horário', kind: 'text' },
    { key: 'items', label: 'Lista de saída', kind: 'list',
      itemFields: [{ key: '', label: 'Item', kind: 'text' }] },
  ],
  rules: [
    { key: 'items', label: 'Regras', kind: 'list', itemFields: [
      { key: 'icon', label: 'Ícone (lucide)', kind: 'text' },
      { key: 'label', label: 'Regra', kind: 'text' } ] },
  ],
  guide: [
    { key: 'places', label: 'Lugares', kind: 'list', itemFields: [
      { key: 'name', label: 'Nome', kind: 'text' },
      { key: 'blurb', label: 'Descrição', kind: 'text' },
      { key: 'distance', label: 'Distância', kind: 'text' },
      { key: 'mapUrl', label: 'Link do mapa', kind: 'text' } ] },
  ],
  emergency: [
    { key: 'contacts', label: 'Contatos', kind: 'list', itemFields: [
      { key: 'label', label: 'Nome', kind: 'text' },
      { key: 'phone', label: 'Telefone', kind: 'text' } ] },
  ],
  whatsapp: [
    { key: 'number', label: 'Número', kind: 'text' },
    { key: 'message', label: 'Mensagem padrão', kind: 'text' },
  ],
  map: [
    { key: 'query', label: 'Endereço / busca', kind: 'text' },
    { key: 'label', label: 'Rótulo do botão', kind: 'text' },
  ],
}
```

NOTE: the `items` field for `checkout` is a list of plain strings; itemFields with an empty `key` signals "the item itself is the value" — the inspector handles that case (Task 8). All other lists are arrays of objects.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/fields.test.ts`
Expected: PASS. (The `checkout.items` itemFields uses key `''`, which is not checked against props — the test only checks top-level `field.key`, i.e. `items`, exists. Confirm `items` exists on checkout props: it does.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/fields.ts apps/web/lib/blocks/__tests__/fields.test.ts
git commit -m "feat: inspector field config + palette meta"
```

---

## Task 4: Zustand builder store

**Files:**
- Create: `apps/web/app/(app)/app/[id]/edit/_builder/store.ts`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts`

Store holds the working `content` tree + selection + dirty + undo/redo. All actions are pure transforms over state. Use `zustand` vanilla `createStore` so the store is testable without React, then expose a React hook.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createBuilderStore } from '../store'
import type { PageContent } from '@/lib/blocks/schema'

const initial: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] },
  ],
}

let store: ReturnType<typeof createBuilderStore>
beforeEach(() => { store = createBuilderStore(initial) })

describe('builder store', () => {
  it('starts on the first section, nothing selected, not dirty', () => {
    const s = store.getState()
    expect(s.activeSectionId).toBe('s1')
    expect(s.selectedBlockId).toBeNull()
    expect(s.dirty).toBe(false)
  })

  it('addBlock appends to the active section and marks dirty', () => {
    store.getState().addBlock('text')
    const sec = store.getState().content.sections[0]
    expect(sec.blocks).toHaveLength(2)
    expect(sec.blocks[1].type).toBe('text')
    expect(store.getState().dirty).toBe(true)
  })

  it('updateBlockProps merges props of a block by id', () => {
    store.getState().updateBlockProps('b1', { text: 'Olá' })
    const block = store.getState().content.sections[0].blocks[0]
    expect(block.props).toMatchObject({ text: 'Olá', level: 1 })
  })

  it('removeBlock deletes by id and clears selection if it was selected', () => {
    store.getState().selectBlock('b1')
    store.getState().removeBlock('b1')
    expect(store.getState().content.sections[0].blocks).toHaveLength(0)
    expect(store.getState().selectedBlockId).toBeNull()
  })

  it('moveBlock reorders within the active section', () => {
    store.getState().addBlock('text')  // now [heading b1, text X]
    const xId = store.getState().content.sections[0].blocks[1].id
    store.getState().moveBlock(xId, 0)  // move text to front
    expect(store.getState().content.sections[0].blocks[0].id).toBe(xId)
  })

  it('addSection adds and switches active to it', () => {
    store.getState().addSection()
    const s = store.getState()
    expect(s.content.sections).toHaveLength(2)
    expect(s.activeSectionId).toBe(s.content.sections[1].id)
  })

  it('removeSection refuses to delete the last remaining section', () => {
    store.getState().removeSection('s1')
    expect(store.getState().content.sections).toHaveLength(1)
  })

  it('setNav changes the nav style', () => {
    store.getState().setNav('onepage')
    expect(store.getState().content.nav).toBe('onepage')
  })

  it('undo reverts the last mutation; redo reapplies it', () => {
    store.getState().addBlock('text')
    expect(store.getState().content.sections[0].blocks).toHaveLength(2)
    store.getState().undo()
    expect(store.getState().content.sections[0].blocks).toHaveLength(1)
    store.getState().redo()
    expect(store.getState().content.sections[0].blocks).toHaveLength(2)
  })

  it('markSaved clears the dirty flag', () => {
    store.getState().addBlock('text')
    store.getState().markSaved()
    expect(store.getState().dirty).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"`
Expected: FAIL — cannot resolve `../store`.

- [ ] **Step 3: Implement**

```ts
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Block, BlockType, PageContent, Section } from '@/lib/blocks/schema'
import { createBlock, createSection } from '@/lib/blocks/defaults'

export interface BuilderState {
  content: PageContent
  activeSectionId: string
  selectedBlockId: string | null
  dirty: boolean
  past: PageContent[]
  future: PageContent[]
  // actions
  selectBlock: (id: string | null) => void
  setActiveSection: (id: string) => void
  addBlock: (type: BlockType) => void
  updateBlockProps: (id: string, patch: Record<string, unknown>) => void
  removeBlock: (id: string) => void
  moveBlock: (id: string, toIndex: number) => void
  addSection: () => void
  renameSection: (id: string, title: string, icon?: string) => void
  removeSection: (id: string) => void
  moveSection: (id: string, toIndex: number) => void
  setNav: (nav: PageContent['nav']) => void
  undo: () => void
  redo: () => void
  markSaved: () => void
}

const clone = (c: PageContent): PageContent => structuredClone(c)

export function createBuilderStore(initial: PageContent) {
  return createStore<BuilderState>((set, get) => {
    // Wraps a content transform: pushes current content to history, sets new content, marks dirty, clears redo.
    const commit = (fn: (draft: PageContent) => void) => {
      const prev = get().content
      const next = clone(prev)
      fn(next)
      set({ content: next, past: [...get().past, prev], future: [], dirty: true })
    }
    const activeSection = (c: PageContent, id: string) => c.sections.find((s) => s.id === id)!

    return {
      content: initial,
      activeSectionId: initial.sections[0].id,
      selectedBlockId: null,
      dirty: false,
      past: [],
      future: [],

      selectBlock: (id) => set({ selectedBlockId: id }),
      setActiveSection: (id) => set({ activeSectionId: id, selectedBlockId: null }),

      addBlock: (type) => commit((c) => {
        activeSection(c, get().activeSectionId).blocks.push(createBlock(type))
      }),

      updateBlockProps: (id, patch) => commit((c) => {
        for (const s of c.sections) {
          const b = s.blocks.find((b) => b.id === id)
          if (b) { (b as Block).props = { ...(b.props as object), ...patch } as Block['props']; return }
        }
      }),

      removeBlock: (id) => {
        commit((c) => { for (const s of c.sections) s.blocks = s.blocks.filter((b) => b.id !== id) })
        if (get().selectedBlockId === id) set({ selectedBlockId: null })
      },

      moveBlock: (id, toIndex) => commit((c) => {
        const s = activeSection(c, get().activeSectionId)
        const from = s.blocks.findIndex((b) => b.id === id)
        if (from === -1) return
        const [moved] = s.blocks.splice(from, 1)
        s.blocks.splice(toIndex, 0, moved)
      }),

      addSection: () => {
        const section = createSection()
        commit((c) => { c.sections.push(section) })
        set({ activeSectionId: section.id, selectedBlockId: null })
      },

      renameSection: (id, title, icon) => commit((c) => {
        const s = c.sections.find((s) => s.id === id)
        if (s) { s.title = title; if (icon) s.icon = icon }
      }),

      removeSection: (id) => {
        if (get().content.sections.length <= 1) return // never delete the last section
        commit((c) => { c.sections = c.sections.filter((s) => s.id !== id) })
        if (get().activeSectionId === id) set({ activeSectionId: get().content.sections[0].id })
      },

      moveSection: (id, toIndex) => commit((c) => {
        const from = c.sections.findIndex((s) => s.id === id)
        if (from === -1) return
        const [moved] = c.sections.splice(from, 1)
        c.sections.splice(toIndex, 0, moved)
      }),

      setNav: (nav) => commit((c) => { c.nav = nav }),

      undo: () => {
        const { past, content, future } = get()
        if (past.length === 0) return
        const prev = past[past.length - 1]
        set({ content: prev, past: past.slice(0, -1), future: [content, ...future], dirty: true })
      },
      redo: () => {
        const { future, content, past } = get()
        if (future.length === 0) return
        const next = future[0]
        set({ content: next, future: future.slice(1), past: [...past, content], dirty: true })
      },

      markSaved: () => set({ dirty: false }),
    }
  })
}

export type BuilderStore = ReturnType<typeof createBuilderStore>
export const useBuilder = <T,>(store: BuilderStore, selector: (s: BuilderState) => T) => useStore(store, selector)
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/store.ts" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"
git commit -m "feat: zustand builder store with undo/redo"
```

---

## Task 5: Debounced autosave hook

**Files:**
- Create: `apps/web/app/(app)/app/[id]/edit/_builder/useAutosave.ts`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/useAutosave.test.ts`

Debounces content changes and PUTs `{ content }` to `/api/pages/[id]`. Reports `status`. Pure-ish: take content + dirty + a save callback; we unit-test the debounce/payload via a small exported `createAutosaver` function plus a thin React hook wrapper.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAutosaver } from '../useAutosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createAutosaver', () => {
  it('debounces: multiple rapid schedules result in one save', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const a = createAutosaver({ delayMs: 1000, save })
    a.schedule({ nav: 'buttons', sections: [] })
    a.schedule({ nav: 'buttons', sections: [] })
    a.schedule({ nav: 'onepage', sections: [] })
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ nav: 'onepage', sections: [] })
  })

  it('reports saving then saved on success', async () => {
    const statuses: string[] = []
    const a = createAutosaver({ delayMs: 500, save: () => Promise.resolve(), onStatus: (s) => statuses.push(s) })
    a.schedule({ nav: 'buttons', sections: [] })
    await vi.advanceTimersByTimeAsync(500)
    expect(statuses).toEqual(['saving', 'saved'])
  })

  it('reports error when save rejects', async () => {
    const statuses: string[] = []
    const a = createAutosaver({ delayMs: 500, save: () => Promise.reject(new Error('x')), onStatus: (s) => statuses.push(s) })
    a.schedule({ nav: 'buttons', sections: [] })
    await vi.advanceTimersByTimeAsync(500)
    expect(statuses).toEqual(['saving', 'error'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/useAutosave.test.ts"`
Expected: FAIL — cannot resolve `../useAutosave`.

- [ ] **Step 3: Implement**

```ts
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PageContent } from '@/lib/blocks/schema'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutosaverOpts {
  delayMs: number
  save: (content: PageContent) => Promise<void>
  onStatus?: (status: SaveStatus) => void
}

export function createAutosaver({ delayMs, save, onStatus }: AutosaverOpts) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: PageContent | null = null
  return {
    schedule(content: PageContent) {
      latest = content
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        timer = null
        const toSave = latest!
        onStatus?.('saving')
        try { await save(toSave); onStatus?.('saved') }
        catch { onStatus?.('error') }
      }, delayMs)
    },
    cancel() { if (timer) clearTimeout(timer); timer = null },
  }
}

// React wrapper: schedules a save whenever `content` changes while `dirty`.
export function useAutosave(pageId: string, content: PageContent, dirty: boolean, onSaved: () => void) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const saver = useMemo(() => createAutosaver({
    delayMs: 1200,
    save: async (c) => {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: c }),
      })
      if (!res.ok) throw new Error('save failed')
      onSaved()
    },
    onStatus: setStatus,
  }), [pageId, onSaved])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (dirty) saver.schedule(content)
    return () => {}
  }, [content, dirty, saver])

  useEffect(() => () => saver.cancel(), [saver])
  return status
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/useAutosave.test.ts"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/useAutosave.ts" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/useAutosave.test.ts"
git commit -m "feat: debounced autosave for builder content"
```

---

## Task 6: Inspector pane

**Files:**
- Create: `apps/web/app/(app)/app/[id]/edit/_builder/Inspector.tsx`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Inspector.test.tsx`

Renders fields for the selected block from `BLOCK_FIELDS`, writing edits through `updateBlockProps`. Field kinds: `text`/`textarea`/`number` → input; `select` → native `<select>`; `list` → repeated sub-field groups with add/remove (each list edit replaces the whole array via `updateBlockProps`). For `heading.level` the select value is a string — convert to number on change.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createBuilderStore } from '../store'
import { Inspector } from '../Inspector'
import type { PageContent } from '@/lib/blocks/schema'

const initial: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'wifi', props: { ssid: 'Net', password: 'p1' } } ] } ] }

it('shows an empty state when nothing is selected', () => {
  const store = createBuilderStore(initial)
  render(<Inspector store={store} />)
  expect(screen.getByText(/selecione um bloco/i)).toBeInTheDocument()
})

it('edits a wifi ssid through the store', () => {
  const store = createBuilderStore(initial)
  store.getState().selectBlock('b1')
  render(<Inspector store={store} />)
  const input = screen.getByLabelText('Rede (SSID)') as HTMLInputElement
  fireEvent.change(input, { target: { value: 'CasaNova' } })
  expect(store.getState().content.sections[0].blocks[0].props).toMatchObject({ ssid: 'CasaNova' })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Inspector.test.tsx"`
Expected: FAIL — cannot resolve `../Inspector`.

- [ ] **Step 3: Implement**

Build `Inspector({ store }: { store: BuilderStore })`. Use `useBuilder(store, s => ...)` to read `selectedBlockId` and the selected block (search sections). If none → render a muted empty state containing the text "Selecione um bloco para editar". Else render `BLOCK_FIELDS[block.type].map(...)`:
- `text`/`number`: `<Label htmlFor>` + `<input>` (use `@/components/ui/input` if present, else native). For `number`, parse to Number on change. Wire `onChange` → `store.getState().updateBlockProps(block.id, { [field.key]: value })`.
- `textarea`: native `<textarea>` (or shadcn Textarea if present) with the same wiring.
- `select`: native `<select>` with `field.options`. For `heading.level`, convert the string value to a number before calling `updateBlockProps`.
- `list`: render `(props[field.key] as unknown[])` as groups. Each group renders `field.itemFields`. Editing an item rebuilds the array immutably and calls `updateBlockProps(block.id, { [field.key]: nextArray })`. Provide "＋ Adicionar" (push a blank item — `{}` for object lists, `''` for the string list where `itemFields[0].key === ''`) and a remove button per item. For the string list (`checkout.items`), the single `itemFields` entry has key `''` meaning the array element IS the value.
- Each input must have an associated label (`htmlFor`/`id` or `aria-label`) — the test queries `getByLabelText('Rede (SSID)')`.

Read each field value from the block's current props (controlled inputs). Because the store replaces the block on each edit, re-reading via the selector keeps inputs in sync.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Inspector.test.tsx"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/Inspector.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Inspector.test.tsx"
git commit -m "feat: builder inspector pane"
```

---

## Task 7: Palette pane

**Files:**
- Create: `apps/web/app/(app)/app/[id]/edit/_builder/Palette.tsx`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Palette.test.tsx`

Lists block types grouped by `BLOCK_META[].group`, each as a button with its icon (`<Icon name={meta.icon} />`) + label. Clicking adds the block to the active section (`store.getState().addBlock(type)`). Each item is ALSO a `@dnd-kit` draggable (`useDraggable`, id `palette:<type>`) for drag-to-add (consumed by Preview's drop zones in Task 9) — but clicking must work independently for accessibility and as the simple path.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { createBuilderStore } from '../store'
import { Palette } from '../Palette'
import type { PageContent } from '@/lib/blocks/schema'

const initial: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [] } ] }

it('renders grouped block buttons', () => {
  render(<DndContext><Palette store={createBuilderStore(initial)} /></DndContext>)
  expect(screen.getByRole('button', { name: /Wi-Fi/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Texto/ })).toBeInTheDocument()
})

it('clicking a palette item adds that block to the active section', () => {
  const store = createBuilderStore(initial)
  render(<DndContext><Palette store={store} /></DndContext>)
  fireEvent.click(screen.getByRole('button', { name: /Wi-Fi/ }))
  const blocks = store.getState().content.sections[0].blocks
  expect(blocks).toHaveLength(1)
  expect(blocks[0].type).toBe('wifi')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Palette.test.tsx"`
Expected: FAIL — cannot resolve `../Palette`.

- [ ] **Step 3: Implement**

`Palette({ store })`: iterate the three groups in order (Básico, Hospedagem, Utilidades); within each, the block types whose `BLOCK_META[type].group` matches, rendered as `<button onClick={() => store.getState().addBlock(type)}>`. Wrap each in a small `DraggableItem` using `useDraggable({ id: \`palette:${type}\` })` that spreads listeners/attributes onto the button (drag for Task 9; click still fires `addBlock`). Use `<Icon name={BLOCK_META[type].icon} />` + label. Group headings use the `.label`/uppercase styles consistent with the app.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Palette.test.tsx"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/Palette.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Palette.test.tsx"
git commit -m "feat: builder block palette"
```

---

## Task 8: Preview pane (render + selection)

**Files:**
- Create: `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx`

Renders the active section's blocks via Plan A's `<BlockRenderer>` inside a phone frame with `data-theme`. Each block is wrapped in a clickable selection shell (`onClick` → `selectBlock`, highlighted when selected, with a small delete button). This task does NOT include drag reordering (Task 9) — keep it a plain list first.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createBuilderStore } from '../store'
import { Preview } from '../Preview'
import type { PageContent } from '@/lib/blocks/schema'

const initial: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } } ] } ] }

it('renders the active section blocks via BlockRenderer', () => {
  render(<Preview store={createBuilderStore(initial)} theme="modern" whatsapp={null} />)
  expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
})

it('clicking a block selects it in the store', () => {
  const store = createBuilderStore(initial)
  render(<Preview store={store} theme="modern" whatsapp={null} />)
  fireEvent.click(screen.getByText('Bem-vindo'))
  expect(store.getState().selectedBlockId).toBe('b1')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"`
Expected: FAIL — cannot resolve `../Preview`.

- [ ] **Step 3: Implement**

`Preview({ store, theme, whatsapp })`: read `content` + `activeSectionId` + `selectedBlockId` via `useBuilder`. Wrapper `<div data-theme={theme} className="guest-site ...">` framed like a phone (max-width, rounded, shadow). Render the active section's blocks: for each, a `<div onClick={() => store.getState().selectBlock(block.id)}>` with a selected ring when `selectedBlockId === block.id`, containing `<BlockRenderer block={block} ctx={{ whatsapp }} />` and a small "✕" delete button (`removeBlock(block.id)`, stop propagation). Empty section → a muted "Arraste blocos para começar" placeholder.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"
git commit -m "feat: builder preview pane with block selection"
```

---

## Task 9: Drag-and-drop (reorder within section + drag-to-add)

**Files:**
- Modify: `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx` (make blocks sortable)
- Modify: `apps/web/app/(app)/app/[id]/edit/_builder/Builder.tsx` will own the `DndContext` (created in Task 10) — for this task, add the sortable wiring inside Preview and a self-contained `DndContext` if Builder isn't built yet; Task 10 will hoist it.
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/dnd.test.ts` (logic-level test of the reorder mapping, not pointer simulation)

DnD pointer interactions are painful to unit-test; test the **index mapping** purely, and wire @dnd-kit in the component.

- [ ] **Step 1: Write the failing test (pure reorder mapping helper)**

```ts
import { describe, it, expect } from 'vitest'
import { reorder } from '../dnd-helpers'

it('reorder moves an item from one index to another', () => {
  expect(reorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
})
it('reorder is a no-op when indices match', () => {
  expect(reorder(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/dnd.test.ts"`
Expected: FAIL — cannot resolve `../dnd-helpers`.

- [ ] **Step 3: Implement the helper + wire @dnd-kit**

Create `dnd-helpers.ts`:
```ts
export function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr.slice()
  const copy = arr.slice()
  const [moved] = copy.splice(from, 1)
  copy.splice(to, 0, moved)
  return copy
}
```
In `Preview.tsx`: wrap the block list in `<SortableContext items={blockIds} strategy={verticalListSortingStrategy}>` and make each block wrapper a `useSortable({ id: block.id })` item (apply `transform`/`transition` from `@dnd-kit/utilities` `CSS.Transform.toString`). The `onDragEnd` handler (in the owning `DndContext`) resolves: if `active.id` starts with `palette:` → `addBlock(type)` (drop-to-add; v1 may append rather than insert-at-index — acceptable); else compute from/to indices among the active section's block ids and call `store.getState().moveBlock(active.id, toIndex)`. Add `PointerSensor` with a small activation distance so clicks still select.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/dnd.test.ts"`
Expected: PASS (2 tests). Also re-run Preview tests → still green.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/dnd-helpers.ts" "apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/dnd.test.ts"
git commit -m "feat: drag-to-reorder blocks + drag-to-add from palette"
```

---

## Task 10: Section tabs + nav toggle + Builder shell + route + entry

**Files:**
- Create: `apps/web/app/(app)/app/[id]/edit/_builder/SectionTabs.tsx`
- Create: `apps/web/app/(app)/app/[id]/edit/_builder/Builder.tsx`
- Create: `apps/web/app/(app)/app/[id]/edit/page.tsx`
- Modify: `apps/web/app/(app)/app/_components/EditPageDialog.tsx` (add a "Construir" link)
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Builder.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Builder } from '../Builder'
import type { PageContent } from '@/lib/blocks/schema'

const content: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } } ] },
  { id: 's2', title: 'Wi-Fi', icon: 'Wifi', blocks: [] } ] }

it('renders the three panes and section tabs', () => {
  render(<Builder pageId="p1" title="Casa" whatsapp={null} theme="modern" initialContent={content} />)
  expect(screen.getByRole('button', { name: /Wi-Fi/ })).toBeInTheDocument() // section tab
  expect(screen.getByText('Bem-vindo')).toBeInTheDocument() // preview of active section
})

it('switching section tab changes the previewed section', () => {
  render(<Builder pageId="p1" title="Casa" whatsapp={null} theme="modern" initialContent={content} />)
  fireEvent.click(screen.getByRole('button', { name: /^Wi-Fi$/ }))
  expect(screen.queryByText('Bem-vindo')).not.toBeInTheDocument()
})
```

NOTE: the Palette also renders a "Wi-Fi" block button, so the first test's `/Wi-Fi/` may match multiple elements. Disambiguate in the implementation by giving section tabs an accessible name that includes the section context, OR in the test use `getAllByRole` — adjust the test to `expect(screen.getAllByRole('button', { name: /Wi-Fi/ }).length).toBeGreaterThan(0)` if needed. Decide during impl and keep the assertion meaningful (a section tab for "Wi-Fi" exists).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Builder.test.tsx"`
Expected: FAIL — cannot resolve `../Builder`.

- [ ] **Step 3: Implement**

`SectionTabs({ store })`: render a tab per section (`setActiveSection`), highlight active; an "＋ Seção" button (`addSection`); inline rename (click to edit `title`, calls `renameSection`); move-left/right buttons (`moveSection`); delete (disabled when one section). Plus a nav-style toggle (`setNav('buttons' | 'onepage')`) — two-option control.

`Builder({ pageId, title, whatsapp, theme, initialContent })` (`'use client'`):
- `const store = useMemo(() => createBuilderStore(initialContent), [])`.
- `const content = useBuilder(store, s => s.content)`, `const dirty = useBuilder(store, s => s.dirty)`.
- `const status = useAutosave(pageId, content, dirty, () => store.getState().markSaved())`.
- Layout: top bar (page title, save status text from `status`, a "Ver página" link to `/<slug>` — pass `slug` too if needed; otherwise omit), `SectionTabs`, then a 3-column grid: `<Palette>` | `<Preview>` | `<Inspector>`. Wrap the palette+preview region in a single `<DndContext>` (sensors + `onDragEnd` from Task 9). On small screens stack vertically (mobile-first); the builder is desktop-first in practice but must not break on narrow widths.

`page.tsx` (server):
```tsx
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { resolvePageContent } from '@/lib/db/queries'
import { Builder } from './_builder/Builder'

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id } = await params
  const [page] = await db.select().from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, session.user.id))).limit(1)
  if (!page) notFound()
  return (
    <Builder
      pageId={page.id}
      title={page.title}
      whatsapp={page.whatsapp}
      theme={page.theme}
      initialContent={resolvePageContent(page.content)}
    />
  )
}
```

`EditPageDialog.tsx`: add a "Construir" button/link near the trigger or inside the dialog footer that navigates to `/app/${page.id}/edit` (use `next/link` or `router.push`). Keep the existing meta (title/whatsapp/theme) editing intact.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Builder.test.tsx"`
Expected: PASS.
Then full run: `pnpm --filter web test` → all green. `pnpm typecheck` → clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit" "apps/web/app/(app)/app/_components/EditPageDialog.tsx"
git commit -m "feat: builder shell, section tabs, edit route + dashboard entry"
```

---

## Task 11: Manual verification

- [ ] **Step 1: Run the app**

`pnpm dev`, log in, open the dashboard, click **Construir** on a page → `/app/<id>/edit`.

- [ ] **Step 2: Verify the builder loop**

- Palette click adds a block to the active section; it appears in the preview.
- Selecting a block shows its fields in the inspector; editing a field updates the preview live.
- Drag reorders blocks within the section.
- Add/rename/switch/delete sections; nav toggle switches button vs one-page.
- Edits autosave (status shows "saving" → "salvo"); reload the page → changes persisted (the PUT wrote `content`).
- Open the public `/<slug>` → the published page reflects saved content (publish via the existing toggle if needed).

- [ ] **Step 3: Finish the branch**

Use superpowers:finishing-a-development-branch.

---

## Self-Review (completed by author)

- **Spec coverage:** 3-pane builder (palette/preview/inspector) — Tasks 6–10 ✓; drag from palette + reorder — Tasks 7, 9 ✓; modular blocks reuse Plan A renderers — Task 8 ✓; templates already seed content (Plan A); ready-made templates selectable on create is an existing/Plan-A concern, not re-implemented here; autosave draft + existing publish — Task 5/10 ✓; section + nav-style management (buttons/onepage) — Task 10 ✓; in-session undo/redo — Task 4 ✓.
- **Intentional deviations (flagged to user):** props edited via inspector (not inline contenteditable) — deferred follow-up; cross-section block drag deferred (delete + re-add); section drag via buttons not pointer-drag; no TanStack Query (a single debounced PUT doesn't need it) and no react-hook-form (store-driven controlled inputs) — leaner than the frontend-rules defaults, justified by YAGNI.
- **Placeholder scan:** logic tasks (2–5) have full code; component tasks (6–10) give explicit interfaces, behaviors, and full tests — component JSX/styling is left to the implementer following existing app patterns, which is appropriate for visual panes and not a placeholder for behavior.
- **Type consistency:** `createBlock`/`createSection`, `BLOCK_TYPES`, `BLOCK_FIELDS`/`BLOCK_META`, `FieldDef`, `createBuilderStore`/`BuilderState`/`BuilderStore`/`useBuilder`, `createAutosaver`/`useAutosave`/`SaveStatus`, `reorder`, and the `Builder`/`Preview`/`Palette`/`Inspector`/`SectionTabs` props are consistent across tasks. Store action names match between Task 4 definition and Tasks 6–10 usage.
```
