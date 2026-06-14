'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
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

export function Builder({ pageId, title, whatsapp, theme, slug, initialContent }: BuilderProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- store created once per mount
  const store = useMemo(() => createBuilderStore(initialContent), [])
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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h1 className="font-display truncate text-lg font-bold">{title}</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{STATUS_LABEL[status]}</span>
          {slug && (
            <Link
              href={`/${slug}`}
              target="_blank"
              className="flex items-center gap-1 text-[#0d9488] hover:underline"
            >
              <ExternalLink className="size-4" />
              Ver página
            </Link>
          )}
        </div>
      </header>

      <SectionTabs store={store} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[200px_1fr_280px]">
          <aside className="overflow-auto border-r border-border">
            <Palette store={store} />
          </aside>
          <Preview store={store} theme={theme} whatsapp={whatsapp} />
          <aside className="overflow-auto border-l border-border">
            <Inspector store={store} />
          </aside>
        </div>
      </DndContext>
    </div>
  )
}
