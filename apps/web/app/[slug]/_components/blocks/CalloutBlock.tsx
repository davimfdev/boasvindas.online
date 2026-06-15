import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'
import { Icon } from './Icon'

const VARIANT: Record<'tip' | 'info' | 'warning', string> = {
  tip: 'bg-gaccent/10 text-gaccent-strong border-gaccent/30',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-gsecondary/15 text-gaccent-strong border-gsecondary/40',
}

export function CalloutBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'callout') return null
  const { variant, icon, text } = block.props
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${VARIANT[variant]}`}>
      <Icon name={icon} size={22} className="shrink-0 mt-0.5" />
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  )
}
