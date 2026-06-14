import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function DividerBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'divider') return null
  if (block.props.variant === 'spacer') return <div data-testid="spacer" className="h-8" />
  return <hr className="border-gray-100" />
}
