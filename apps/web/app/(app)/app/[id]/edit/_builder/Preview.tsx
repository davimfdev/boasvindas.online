'use client'

import { BlockRenderer } from '@/app/[slug]/_components/blocks/BlockRenderer'
import { useBuilder } from './store'
import type { BuilderStore } from './store'

interface PreviewProps {
  store: BuilderStore
  theme: string
  whatsapp: string | null
}

export function Preview({ store, theme, whatsapp }: PreviewProps) {
  const content = useBuilder(store, (s) => s.content)
  const activeSectionId = useBuilder(store, (s) => s.activeSectionId)
  const selectedBlockId = useBuilder(store, (s) => s.selectedBlockId)

  const activeSection =
    content.sections.find((s) => s.id === activeSectionId) ?? content.sections[0]

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/40 p-8">
      <div
        data-theme={theme}
        className="guest-site relative w-full max-w-[420px] rounded-[2rem] shadow-2xl bg-background overflow-hidden"
      >
        {activeSection.blocks.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Adicione blocos pelo painel à esquerda
          </p>
        ) : (
          activeSection.blocks.map((block) => {
            const isSelected = selectedBlockId === block.id
            return (
              <div
                key={block.id}
                role="group"
                className={[
                  'relative cursor-pointer transition-all',
                  isSelected
                    ? 'ring-2 ring-[#0d9488] ring-inset'
                    : 'hover:ring-1 hover:ring-[#0d9488]/40 hover:ring-inset',
                ].join(' ')}
                onClick={() => store.getState().selectBlock(block.id)}
              >
                <BlockRenderer block={block} ctx={{ whatsapp }} />
                <button
                  aria-label="Remover bloco"
                  className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/80 text-xs text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:!opacity-100 focus:!opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    store.getState().removeBlock(block.id)
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
