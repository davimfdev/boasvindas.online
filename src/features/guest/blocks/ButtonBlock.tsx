import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function ButtonBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'button') return null
  const { label, href, kind } = block.props
  const resolved =
    kind === 'whatsapp' ? `https://wa.me/${href.replace(/\D/g, '')}` :
    kind === 'tel' ? `tel:${href}` :
    href
  const external = kind === 'link' || kind === 'map' || kind === 'whatsapp'
  return (
    <a
      href={resolved}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gaccent px-5 py-4 font-bold text-gsecondary shadow-lg active:scale-[0.98] transition-all"
    >
      {label}
    </a>
  )
}
