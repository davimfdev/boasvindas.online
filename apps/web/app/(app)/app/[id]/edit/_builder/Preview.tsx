'use client'

import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BlockRenderer } from '@/app/[slug]/_components/blocks/BlockRenderer'
import { useBuilder } from './store'
import type { BuilderStore } from './store'
import type { Block } from '@/lib/blocks/schema'

interface PreviewProps {
  store: BuilderStore
  theme: string
  whatsapp: string | null
}

interface SortableBlockProps {
  block: Block
  isSelected: boolean
  whatsapp: string | null
  onSelect: () => void
  onRemove: () => void
}

const FULL_BLEED: ReadonlySet<Block['type']> = new Set(['hero', 'image', 'divider', 'map'])

function SortableBlock({ block, isSelected, whatsapp, onSelect, onRemove }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
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
      <div className="pointer-events-none select-none">
        <BlockRenderer block={block} ctx={{ whatsapp }} />
      </div>
      <button
        aria-label="Remover bloco"
        className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/80 text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:!opacity-100 focus:!opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        ✕
      </button>
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
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-8 pb-8">
              {activeSection.blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  whatsapp={whatsapp}
                  onSelect={() => store.getState().selectBlock(block.id)}
                  onRemove={() => store.getState().removeBlock(block.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}
