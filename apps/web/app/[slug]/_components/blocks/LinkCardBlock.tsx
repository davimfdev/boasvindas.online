import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function LinkCardBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'linkcard') return null
  const { title, text, links } = block.props
  const valid = links.filter((l) => l.href)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="space-y-1">
        <h3 className="font-serif font-bold text-lg text-gaccent">{title}</h3>
        {text && <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">{text}</p>}
      </div>
      {valid.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {valid.map((l, idx) => (
            <a
              key={idx}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gaccent text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
