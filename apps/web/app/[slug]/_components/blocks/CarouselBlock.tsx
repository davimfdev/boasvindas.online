'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (images.length < 2 || prefersReducedMotion()) return
    const id = setInterval(() => setActive((i) => (i + 1) % images.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [images.length])

  if (block.type !== 'carousel' || images.length === 0) return null

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-md p-2 ${fill ? 'h-full' : ''}`}>
      <div
        data-carousel-track
        className="flex transition-transform duration-700 ease-out h-full"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {images.map((img, idx) => (
          <figure key={idx} className={`shrink-0 w-full relative rounded-2xl overflow-hidden ${fill ? 'h-full' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- guest pages use plain <img>, consistent with ImageBlock */}
            <img src={img.url} alt={img.alt} className={`w-full object-cover ${fill ? 'h-full' : 'h-56'}`} loading="lazy" />
            {img.caption && (
              <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs p-3">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`Ir para foto ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === active ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
