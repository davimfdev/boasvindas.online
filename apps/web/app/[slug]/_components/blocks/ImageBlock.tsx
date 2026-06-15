import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function ImageBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'image') return null
  const { url, alt, caption } = block.props
  const fill = !!block.layout?.height
  return (
    <figure className={fill ? 'h-full flex flex-col space-y-2' : 'space-y-2'}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={`w-full rounded-2xl object-cover ${fill ? 'flex-1 min-h-0 h-full' : ''}`}
      />
      {caption && <figcaption className="text-center text-sm text-gray-400">{caption}</figcaption>}
    </figure>
  )
}
