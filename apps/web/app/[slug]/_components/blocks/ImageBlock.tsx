import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function ImageBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'image') return null
  const { url, alt, caption } = block.props
  return (
    <figure className="space-y-2">
      <img src={url} alt={alt} loading="lazy" className="w-full rounded-2xl object-cover" />
      {caption && <figcaption className="text-center text-sm text-gray-400">{caption}</figcaption>}
    </figure>
  )
}
