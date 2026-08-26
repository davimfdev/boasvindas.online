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
    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-card/50 px-5 py-2.5">
      <nav aria-label="Seções" className="flex flex-wrap items-center gap-1">
        {sections.map((section, i) => {
          const isActive = section.id === activeSectionId
          const isEditing = editingId === section.id
          return (
            <div
              key={section.id}
              className={[
                'flex items-center gap-1 rounded-full border px-1 py-0.5 text-sm transition-all',
                isActive
                  ? 'border-[#0d9488]/40 bg-[#0d9488]/10 shadow-sm'
                  : 'border-transparent hover:bg-accent/60',
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
                  className={[
                    'rounded-full px-3 py-0.5 font-medium transition-colors',
                    isActive ? 'text-[#0d9488]' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
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
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => store.getState().addSection()}
        >
          <Plus className="size-4" />
          Seção
        </button>
      </nav>

      <div className="ml-auto flex items-center gap-0.5 rounded-full border border-border/70 bg-muted/40 p-0.5 text-xs font-semibold">
        <button
          type="button"
          className={[
            'rounded-full px-3 py-1 transition-all',
            content.nav === 'buttons'
              ? 'bg-gradient-to-br from-[#0d9488] to-[#0f766e] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
          onClick={() => store.getState().setNav('buttons')}
        >
          Botões
        </button>
        <button
          type="button"
          className={[
            'rounded-full px-3 py-1 transition-all',
            content.nav === 'onepage'
              ? 'bg-gradient-to-br from-[#0d9488] to-[#0f766e] text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
          onClick={() => store.getState().setNav('onepage')}
        >
          Página única
        </button>
      </div>
    </div>
  )
}
