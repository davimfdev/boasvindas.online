'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

function chipClass(active: boolean): string {
  return `px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all border ${
    active ? 'bg-gaccent text-gsecondary border-gaccent shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
  }`
}

export function GuideBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'guide') return null
  const { places } = block.props
  const [selected, setSelected] = useState<string | null>(null)

  const allTags = Array.from(new Set(places.flatMap((p) => p.tags)))
  const shown = selected ? places.filter((p) => p.tags.includes(selected)) : places

  return (
    <div className="p-6 animate-fadeIn">
      {allTags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button type="button" onClick={() => setSelected(null)} className={chipClass(selected === null)}>Tudo</button>
          {allTags.map((tag) => (
            <button key={tag} type="button" onClick={() => setSelected(tag)} className={chipClass(selected === tag)}>{tag}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((place, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-center justify-between group hover:border-gsecondary/30 transition-all"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="bg-gsurface text-gaccent p-3 rounded-xl shrink-0">
                <MapPin size={18} />
              </div>
              <div className="min-w-0 pr-2">
                <h4 className="font-bold text-gaccent text-sm leading-tight">{place.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{place.blurb}</p>
                {place.distance && <p className="text-[11px] text-gray-400 mt-0.5">{place.distance}</p>}
                {place.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {place.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gsurface text-gaccent text-[9px] font-black uppercase tracking-wider rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {place.mapUrl && (
              <a
                href={place.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gaccent text-gsecondary p-3 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all hover:bg-gaccent-strong shrink-0"
                aria-label={`Abrir ${place.name} no mapa`}
              >
                <MapPin size={20} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
