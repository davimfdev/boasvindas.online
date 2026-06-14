import { Phone, AlertCircle } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function EmergencyBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'emergency') return null
  const { contacts } = block.props

  return (
    <div className="p-6 animate-fadeIn space-y-6">
      <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 text-red-800">
        <AlertCircle className="shrink-0" />
        <p className="text-sm">Em caso de emergência, entre em contato imediatamente com os serviços competentes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contacts.map((contact, idx) => (
          <a
            key={idx}
            href={`tel:${contact.phone}`}
            className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-red-200 transition-all active:scale-[0.98]"
          >
            <div className="flex flex-col">
              <span className="font-bold text-gray-800">{contact.label}</span>
              <span className="text-lg font-mono text-red-600 font-bold">{contact.phone}</span>
            </div>
            <div className="bg-red-50 text-red-600 p-3 rounded-full">
              <Phone size={24} fill="currentColor" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
