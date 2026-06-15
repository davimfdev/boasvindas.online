'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

type Img = { url: string; alt: string; caption?: string }

const ROTATE_MS = 4000

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function CarouselBlock({ block }: { block: Block; ctx: RenderCtx }) {
  const images = block.type === 'carousel' ? block.props.images.filter((i): i is Img => Boolean(i.url)) : []
  const [active, setActive] = useState(0)
  const fill = !!block.layout?.height
  const count = images.length

  useEffect(() => {
    if (count < 2 || prefersReducedMotion()) return
    const id = setInterval(() => setActive((i) => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(id)
  }, [count])

  if (block.type !== 'carousel' || count === 0) return null

  const go = (delta: number) => setActive((i) => (i + delta + count) % count)

  return (
    <div className={`group relative overflow-hidden rounded-2xl shadow-md bg-gray-50 ${fill ? 'h-full' : ''}`}>
      <div
        data-carousel-track
        className={`flex transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${fill ? 'h-full' : 'h-72'}`}
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {images.map((img, idx) => (
          <figure key={idx} className="shrink-0 w-full h-full relative flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- guest pages use plain <img>, consistent with ImageBlock */}
            <img src={img.url} alt={img.alt} className="max-w-full max-h-full w-auto h-auto object-contain" loading="lazy" />
            {img.caption && (
              <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs p-3">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-white/80 text-gaccent shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-white/80 text-gaccent shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity active:scale-90"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActive(idx)}
                aria-label={`Ir para foto ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === active ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
