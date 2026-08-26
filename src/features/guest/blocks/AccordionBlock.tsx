import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'
import { Icon } from './Icon'

interface Item { icon: string; title: string; summary: string; body: string }

function AccordionItem({ item }: { item: Item }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isOpen ? 'border-gaccent ring-1 ring-gaccent/10' : 'border-gray-100'}`}>
      <button onClick={() => setIsOpen((o) => !o)} className="w-full p-4 flex gap-3 text-left items-start">
        <div className={`p-2 h-fit rounded-lg ${isOpen ? 'bg-gaccent/10' : 'bg-gray-50'}`}>
          <Icon name={item.icon} size={20} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-bold text-sm text-gray-800">{item.title}</h4>
            {isOpen ? <ChevronUp size={20} className="text-gray-400 shrink-0" /> : <ChevronDown size={20} className="text-gray-400 shrink-0" />}
          </div>
          {item.summary && <p className="text-sm text-gray-600 leading-relaxed mt-1">{item.summary}</p>}
        </div>
      </button>
      {isOpen && item.body && (
        <div className="px-4 pb-4 animate-fadeIn">
          <p className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">{item.body}</p>
        </div>
      )}
    </div>
  )
}

export function AccordionBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'accordion') return null
  return (
    <div className="space-y-3 p-2">
      {block.props.items.map((item, idx) => <AccordionItem key={idx} item={item} />)}
    </div>
  )
}
