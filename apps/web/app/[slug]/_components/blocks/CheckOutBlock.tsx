import { ClipboardCheck } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function CheckOutBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'checkout') return null
  const { time, items } = block.props

  return (
    <div className="p-6 animate-fadeIn space-y-8">
      <div className="bg-amber-100 border border-amber-200 p-6 rounded-2xl text-center">
        <p className="text-xs uppercase font-bold text-amber-700 tracking-widest mb-1">Horário Limite</p>
        <p className="text-4xl font-serif font-bold text-amber-900">{time}</p>
      </div>

      {items.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-bold font-serif text-gaccent flex items-center gap-2">
            <ClipboardCheck size={24} />
            Checklist de Saída
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center gap-4">
                <span className="text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
