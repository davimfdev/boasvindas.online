import { MapPin } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function MapBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'map') return null
  const { query, label } = block.props
  const href = `https://www.google.com/maps?q=${encodeURIComponent(query)}`
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-2 rounded-xl bg-gbg px-4 py-3 font-bold text-gaccent">
      <MapPin size={18} />{label || query}
    </a>
  )
}
