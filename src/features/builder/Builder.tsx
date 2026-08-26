import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Palette as PaletteIcon, Sparkles } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { BlockType, PageContent } from '@/lib/blocks/schema'
import { createBuilderStore, useBuilder } from './store'
import { useAutosave, type SaveStatus } from './useAutosave'
import { Palette } from './Palette'
import { Preview } from './Preview'
import { Inspector } from './Inspector'
import { SectionTabs } from './SectionTabs'
import { ThemePanel } from './ThemePanel'

interface BuilderProps {
  pageId: string
  title: string
  whatsapp: string | null
  theme: string
  slug?: string
  initialContent: PageContent
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: 'Tudo salvo',
  saving: 'Salvando…',
  saved: 'Salvo',
  error: 'Erro ao salvar',
}

const STATUS_DOT: Record<SaveStatus, string> = {
  idle: 'bg-emerald-500',
  saving: 'bg-amber-400 animate-pulse',
  saved: 'bg-emerald-500',
  error: 'bg-red-500',
}

export function Builder({ pageId, title, whatsapp, theme, slug, initialContent }: BuilderProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- store created once per mount
  const store = useMemo(() => createBuilderStore(initialContent), [])
  const [showTheme, setShowTheme] = useState(false)
  const content = useBuilder(store, (s) => s.content)
  const dirty = useBuilder(store, (s) => s.dirty)

  const onSaved = useCallback(() => store.getState().markSaved(), [store])
  const status = useAutosave(pageId, content, dirty, onSaved)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)

    if (activeId.startsWith('palette:')) {
      store.getState().addBlock(activeId.slice('palette:'.length) as BlockType)
      return
    }

    if (activeId === over.id) return
    const state = store.getState()
    const section = state.content.sections.find((s) => s.id === state.activeSectionId)
    if (!section) return
    const toIndex = section.blocks.findIndex((b) => b.id === over.id)
    if (toIndex === -1) return
    state.moveBlock(activeId, toIndex)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-muted/20">
      <header className="flex items-center justify-between gap-4 border-b border-border/70 bg-card/70 px-5 py-2.5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#0d9488] to-[#0f766e] text-white shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <h1 className="font-display truncate text-base font-bold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setShowTheme((v) => !v)}
            aria-pressed={showTheme}
            className={[
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95',
              showTheme
                ? 'bg-[#0d9488]/12 text-[#0d9488] ring-1 ring-inset ring-[#0d9488]/30'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ].join(' ')}
          >
            <PaletteIcon className="size-3.5" />
            Tema
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
          {slug && (
            <Link
              to={`/${slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0d9488] to-[#0f766e] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-95"
            >
              <ExternalLink className="size-3.5" />
              Ver página
            </Link>
          )}
        </div>
      </header>

      <SectionTabs store={store} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={`grid flex-1 grid-cols-1 overflow-hidden ${showTheme ? 'md:grid-cols-[200px_1fr_280px_18rem]' : 'md:grid-cols-[200px_1fr_280px]'}`}>
          <aside className="overflow-auto border-r border-border/70 bg-card/40">
            <Palette store={store} />
          </aside>
          <Preview store={store} theme={theme} whatsapp={whatsapp} />
          <aside className="overflow-auto border-l border-border/70 bg-card/40">
            <Inspector store={store} />
          </aside>
          {showTheme && <ThemePanel store={store} />}
        </div>
      </DndContext>
    </div>
  )
}
