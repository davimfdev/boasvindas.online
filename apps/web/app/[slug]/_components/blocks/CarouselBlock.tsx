import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

type Img = { url: string; alt: string; caption?: string }

export function CarouselBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'carousel') return null
  const images = block.props.images.filter((i): i is Img => Boolean(i.url))
  if (images.length === 0) return null
  const fill = !!block.layout?.height
  return (
    <div className={`flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide p-2 ${fill ? 'h-full' : ''}`}>
      {images.map((img, idx) => (
        <figure key={idx} className={`snap-center shrink-0 w-[85%] max-w-md relative rounded-2xl overflow-hidden shadow-md ${fill ? 'h-full' : ''}`}>
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
  )
}
