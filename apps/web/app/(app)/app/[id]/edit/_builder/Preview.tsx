'use client'

import { useEffect, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BlockRenderer } from '@/app/[slug]/_components/blocks/BlockRenderer'
import { blockGridStyle, spanFromFraction, FILLABLE_BLOCKS } from '@/lib/blocks/layout'
import { useGridRowSpan } from '@/lib/blocks/useGridRowSpan'
import { resolveTheme } from '@/lib/theme/theme'
import { FONTS } from '@/lib/theme/fonts'
import { useBuilder } from './store'
import type { BuilderStore } from './store'
import type { Block } from '@/lib/blocks/schema'

interface PreviewProps {
  store: BuilderStore
  theme: string
  whatsapp: string | null
}

const FULL_BLEED: ReadonlySet<Block['type']> = new Set(['hero', 'image', 'divider', 'map'])

interface SortableBlockProps {
  block: Block
  isSelected: boolean
  whatsapp: string | null
  containerRef: React.RefObject<HTMLDivElement | null>
  store: BuilderStore
  onSelect: () => void
  onRemove: () => void
}

function SortableBlock({ block, isSelected, whatsapp, containerRef, store, onSelect, onRemove }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanupRef.current?.(), [])

  const setRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el)
    wrapperRef.current = el
  }

  const canFill = FILLABLE_BLOCKS.has(block.type)
  const { ref: contentRef, span } = useGridRowSpan<HTMLDivElement>()

  const style: React.CSSProperties = {
    ...blockGridStyle(block.layout),
    gridRowEnd: `span ${span}`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function startResize(e: React.PointerEvent, axes: { width?: boolean; height?: boolean }) {
    e.stopPropagation()
    e.preventDefault()
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const before = store.getState().content
    let moved = false
    const containerW = containerRef.current?.getBoundingClientRect().width ?? 0
    const left = wrapper.getBoundingClientRect().left
    const startY = e.clientY
    const startH = wrapper.getBoundingClientRect().height
    const onMove = (ev: PointerEvent) => {
      if (!moved) { moved = true; store.getState().pushHistory(before) }
      const patch: Partial<NonNullable<Block['layout']>> = {}
      if (axes.width) patch.width = spanFromFraction(ev.clientX - left, containerW)
      if (axes.height) patch.height = Math.max(40, Math.round(startH + ev.clientY - startY))
      store.getState().setBlockLayoutLive(block.id, patch)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cleanup)
      cleanupRef.current = null
    }
    cleanupRef.current = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cleanup)
  }

  return (
    <div
      ref={setRefs}
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
      role="group"
    >
      {/* Disable inner links/buttons during edit: clicks select the block, never navigate */}
      <div
        ref={contentRef}
        className={['pointer-events-none select-none', block.layout?.height ? 'h-full overflow-hidden max-md:!h-auto' : ''].join(' ')}
        style={block.layout?.height ? { height: block.layout.height } : undefined}
      >
        <BlockRenderer block={block} ctx={{ whatsapp }} />
      </div>

      <button
        aria-label="Remover bloco"
        className="absolute right-1 top-1 z-30 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/80 text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:!opacity-100 focus:!opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        ✕
      </button>

      {isSelected && (
        <>
          <div
            role="separator"
            aria-label="Redimensionar largura"
            onPointerDown={(e) => startResize(e, { width: true })}
            className="absolute right-0 top-0 z-20 h-full w-2 cursor-ew-resize hover:bg-[#0d9488]/30"
          />
          {canFill && (
            <>
              <div
                role="separator"
                aria-label="Redimensionar altura"
                onPointerDown={(e) => startResize(e, { height: true })}
                className="absolute bottom-0 left-0 z-20 h-2 w-full cursor-ns-resize hover:bg-[#0d9488]/30"
              />
              <div
                aria-label="Redimensionar largura e altura"
                onPointerDown={(e) => startResize(e, { width: true, height: true })}
                className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-nwse-resize bg-[#0d9488]"
              />
            </>
          )}
        </>
      )}
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const resolved = content.theme ? resolveTheme(content.theme, theme) : null

  return (
    <div
      className="flex flex-1 items-start justify-center overflow-auto bg-muted/30 p-6"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(120,120,135,0.10) 1px, transparent 0)',
        backgroundSize: '22px 22px',
      }}
    >
      <div
        ref={setNodeRef}
        data-theme={resolved ? undefined : theme}
        style={resolved?.vars}
        className={[
          'guest-site relative w-full max-w-3xl rounded-2xl shadow-2xl ring-1 ring-border/50 bg-background overflow-hidden',
          isOver ? 'ring-2 ring-[#0d9488]' : '',
        ].join(' ')}
      >
        {resolved && (
          <>
            <link rel="stylesheet" href={FONTS[resolved.headingFont].cssHref} />
            <link rel="stylesheet" href={FONTS[resolved.bodyFont].cssHref} />
          </>
        )}
        {activeSection.blocks.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Adicione blocos pelo painel à esquerda
          </p>
        ) : (
          <SortableContext items={blockIds} strategy={rectSortingStrategy}>
            <div
              ref={containerRef}
              className="grid grid-cols-1 md:grid-cols-12 gap-x-3 pb-8"
              style={{ gridAutoRows: '8px', gridAutoFlow: 'dense' }}
            >
              {activeSection.blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  whatsapp={whatsapp}
                  containerRef={containerRef}
                  store={store}
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
