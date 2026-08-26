import { MessageCircle } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function WhatsAppBlock({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'whatsapp') return null
  const raw = block.props.number || ctx.whatsapp || ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  const href = `https://wa.me/${digits}${block.props.message ? `?text=${encodeURIComponent(block.props.message)}` : ''}`
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 font-bold text-white shadow-lg">
      <MessageCircle size={20} />WhatsApp
    </a>
  )
}
