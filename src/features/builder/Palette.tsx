import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@/features/guest/blocks/Icon'
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
      className="group flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm transition-all hover:-translate-y-px hover:border-border/70 hover:bg-card hover:shadow-sm active:cursor-grabbing"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-[#0d9488]/12 group-hover:text-[#0d9488]">
        <Icon name={meta.icon} size={16} />
      </span>
      <span className="font-medium">{meta.label}</span>
    </button>
  )
}

interface PaletteProps {
  store: BuilderStore
}

export function Palette({ store }: PaletteProps) {
  return (
    <div className="flex flex-col gap-5 p-3">
      {GROUPS.map((group) => {
        const types = BLOCK_TYPES.filter(
          (type) => BLOCK_META[type].group === (group as Group)
        )
        return (
          <div key={group}>
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              {group}
            </p>
            <div className="flex flex-col gap-0.5">
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
