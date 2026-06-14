import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Block, BlockType, PageContent } from '@/lib/blocks/schema'
import { createBlock, createSection } from '@/lib/blocks/defaults'

export interface BuilderState {
  content: PageContent
  activeSectionId: string
  selectedBlockId: string | null
  dirty: boolean
  past: PageContent[]
  future: PageContent[]
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
        if (get().content.sections.length <= 1) return
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
