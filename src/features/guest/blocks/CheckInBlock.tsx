import { Clock, Smartphone, MapPin, ChevronRight, Info, ShieldCheck } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function CheckInBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'checkin') return null
  const { time, address, accessCode, instructions } = block.props
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <div className="p-6 animate-fadeIn space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b pb-4 border-gray-50">
          <div className="flex items-center gap-2 text-gaccent">
            <Clock size={20} />
            <span className="font-bold">Horários</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-teal-50 rounded-xl">
            <p className="text-xs text-teal-600 font-bold uppercase">Entrada</p>
            <p className="text-lg font-bold text-gray-800">{time}</p>
          </div>
        </div>
      </div>

      {accessCode && (
        <section className="space-y-4">
          <h3 className="text-xl font-bold font-serif text-gaccent flex items-center gap-2">
            <Smartphone size={24} />
            Código de Acesso
          </h3>
          <div className="bg-gaccent text-white p-6 rounded-2xl shadow-lg space-y-4">
            <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-center">
              <p className="text-xs uppercase font-bold tracking-widest mb-1 opacity-80">Código</p>
              <p className="text-2xl font-mono font-bold">{accessCode}</p>
            </div>
            <div className="flex items-start gap-3 bg-white/20 p-3 rounded-lg text-sm">
              <ShieldCheck size={24} className="shrink-0" />
              <p>Sua senha é pessoal e intransferível. Não forneça a ninguém.</p>
            </div>
          </div>
        </section>
      )}

      {instructions && (
        <div className="flex items-start gap-3 bg-white/20 p-3 rounded-lg text-sm border border-gray-100 bg-white rounded-xl shadow-sm">
          <Info size={20} className="shrink-0 text-gaccent" />
          <p className="text-gray-700">{instructions}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-2">Endereço</h4>
          <p className="text-sm text-gaccent font-bold">{address}</p>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MapPin size={20} /></div>
            <span className="font-bold text-gray-700">Como chegar</span>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </a>
      </div>
    </div>
  )
}
