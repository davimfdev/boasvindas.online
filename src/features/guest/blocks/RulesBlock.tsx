import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'
import { Icon } from './Icon'

export function RulesBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'rules') return null
  const { items } = block.props

  return (
    <div className="p-6 animate-fadeIn space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm flex items-start gap-4 border border-gray-100">
            <div className="p-2 bg-gray-50 rounded-lg">
              <Icon name={item.icon} size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">{item.label}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
