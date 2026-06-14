import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function TextBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'text') return null
  return <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-600">{block.props.text}</p>
}
