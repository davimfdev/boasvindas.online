'use client'

import { Phone, AlertCircle, Info } from 'lucide-react'
import { EMERGENCY_CONTACTS } from './guest-data'

function formatPhoneNumber(num: string) {
  if (num.length === 3) return num
  return num.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function Emergency() {
  return (
    <div className="p-6 animate-fadeIn space-y-6">
      <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 text-red-800">
        <AlertCircle className="shrink-0" />
        <p className="text-sm">Em caso de emergência, entre em contato imediatamente com os serviços competentes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {EMERGENCY_CONTACTS.map((contact, idx) => (
          <a
            key={idx}
            href={`tel:${contact.number}`}
            className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-red-200 transition-all active:scale-[0.98]"
          >
            <div className="flex flex-col">
              <span className="font-bold text-gray-800">{contact.name}</span>
              <span className="text-lg font-mono text-red-600 font-bold">{formatPhoneNumber(contact.number)}</span>
            </div>
            <div className="bg-red-50 text-red-600 p-3 rounded-full">
              <Phone size={24} fill="currentColor" />
            </div>
          </a>
        ))}
      </div>

      <div className="bg-gray-100 p-4 rounded-xl flex gap-3 text-gray-600 text-sm italic">
        <Info className="shrink-0" size={18} />
        <p>Estes números estão disponíveis 24h por dia para auxílio à população.</p>
      </div>
    </div>
  )
}
