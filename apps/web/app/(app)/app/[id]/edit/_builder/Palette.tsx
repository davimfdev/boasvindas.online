'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@/app/[slug]/_components/blocks/Icon'
import { BLOCK_META } from '@/lib/blocks/fields'
import { BLOCK_TYPES } from '@/lib/blocks/defaults'
import type { BlockType } from '@/lib/blocks/schema'
import type { BuilderStore } from './store'

const GROUPS = ['Básico', 'Hospedagem', 'Utilidades'] as const
type Group = (typeof GROUPS)[number]

interface DraggableItemProps {
  type: BlockType
  store: BuilderStore
}

function DraggableItem({ type, store }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${type}`,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = BLOCK_META[type]

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => store.getState().addBlock(type)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
    >
      <Icon name={meta.icon} size={18} className="shrink-0" />
      <span>{meta.label}</span>
    </button>
  )
}

interface PaletteProps {
  store: BuilderStore
}

export function Palette({ store }: PaletteProps) {
  return (
    <div className="flex flex-col gap-4 p-2">
      {GROUPS.map((group) => {
        const types = BLOCK_TYPES.filter(
          (type) => BLOCK_META[type].group === (group as Group)
        )
        return (
          <div key={group}>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </p>
            <div className="flex flex-col">
              {types.map((type) => (
                <DraggableItem key={type} type={type} store={store} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
