'use client'

import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useBuilder } from './store'
import type { BuilderStore } from './store'

interface Props {
  store: BuilderStore
}

export function SectionTabs({ store }: Props) {
  const content = useBuilder(store, (s) => s.content)
  const activeSectionId = useBuilder(store, (s) => s.activeSectionId)
  const [editingId, setEditingId] = useState<string | null>(null)

  const sections = content.sections

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <nav aria-label="Seções" className="flex flex-wrap items-center gap-1">
        {sections.map((section, i) => {
          const isActive = section.id === activeSectionId
          const isEditing = editingId === section.id
          return (
            <div
              key={section.id}
              className={[
                'flex items-center gap-1 rounded-md border px-1 py-0.5 text-sm',
                isActive ? 'border-[#0d9488] bg-[#0d9488]/10' : 'border-transparent',
              ].join(' ')}
            >
              {isEditing ? (
                <input
                  autoFocus
                  aria-label="Nome da seção"
                  className="w-28 rounded border border-input bg-background px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue={section.title}
                  onBlur={(e) => {
                    store.getState().renameSection(section.id, e.target.value || section.title)
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="px-2 py-0.5 font-medium"
                  onClick={() => {
                    if (isActive) setEditingId(section.id)
                    else store.getState().setActiveSection(section.id)
                  }}
                >
                  {section.title}
                </button>
              )}
              {isActive && !isEditing && (
                <span className="flex items-center">
                  <button
                    type="button"
                    aria-label="Mover seção para a esquerda"
                    disabled={i === 0}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => store.getState().moveSection(section.id, i - 1)}
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mover seção para a direita"
                    disabled={i === sections.length - 1}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => store.getState().moveSection(section.id, i + 1)}
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir seção"
                    disabled={sections.length <= 1}
                    className="p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-30"
                    onClick={() => store.getState().removeSection(section.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              )}
            </div>
          )
        })}
        <button
          type="button"
          aria-label="Adicionar seção"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => store.getState().addSection()}
        >
          <Plus className="size-4" />
          Seção
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5 text-xs">
        <button
          type="button"
          className={[
            'rounded px-2 py-1',
            content.nav === 'buttons' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground',
          ].join(' ')}
          onClick={() => store.getState().setNav('buttons')}
        >
          Botões
        </button>
        <button
          type="button"
          className={[
            'rounded px-2 py-1',
            content.nav === 'onepage' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground',
          ].join(' ')}
          onClick={() => store.getState().setNav('onepage')}
        >
          Página única
        </button>
      </div>
    </div>
  )
}
