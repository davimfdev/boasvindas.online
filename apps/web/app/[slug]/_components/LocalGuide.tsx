'use client'

import { useState } from 'react'
import { MapPin, Navigation, Search, Utensils, ShoppingBag, Landmark, Coffee, ShieldAlert, PhoneCall, Building, Store } from 'lucide-react'
import { LOCAL_PLACES } from './guest-data'

const categories = ['Tudo', 'Restaurantes', 'Panificadora', 'Farmácias', 'Supermercados', 'Shoppings', 'Lazer', 'Bancos', 'Feiras', 'Emergência Médica']

function getCategoryIcon(category: string) {
  switch (category) {
    case 'Restaurantes': return <Utensils size={18} />
    case 'Panificadora': return <Coffee size={18} />
    case 'Farmácias': return <ShieldAlert size={18} />
    case 'Emergência Médica': return <PhoneCall size={18} />
    case 'Supermercados': return <Search size={18} />
    case 'Shoppings': return <ShoppingBag size={18} />
    case 'Lazer': return <Landmark size={18} />
    case 'Bancos': return <Building size={18} />
    case 'Feiras': return <Store size={18} />
    default: return <MapPin size={18} />
  }
}

export function LocalGuide() {
  const [filter, setFilter] = useState('Tudo')

  const filteredPlaces = filter === 'Tudo' ? LOCAL_PLACES : LOCAL_PLACES.filter((p) => p.category === filter)

  function handleNavigate(address: string, mapUrl?: string) {
    if (mapUrl) {
      window.open(mapUrl, '_blank')
      return
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
  }

  return (
    <div className="animate-fadeIn min-h-screen">
      <div className="bg-white py-6 px-4 border-b border-gray-100 shadow-sm">
        <div className="flex flex-wrap justify-center items-center gap-2 max-w-md mx-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-200 border ${
                filter === cat
                  ? 'bg-gaccent text-gsecondary border-gaccent shadow-md scale-105'
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 active:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlaces.map((place, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-center justify-between group hover:border-gsecondary/30 transition-all animate-slideUp"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="bg-gsurface text-gaccent p-3 rounded-xl shrink-0">{getCategoryIcon(place.category)}</div>
              <div className="min-w-0 pr-2">
                <h4 className="font-bold text-gaccent text-sm leading-tight truncate">{place.name}</h4>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{place.category}</p>
                {place.address && <p className="text-[11px] text-gray-500 mt-1 truncate">{place.address}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => handleNavigate(place.address || place.name, place.mapUrl)}
                className="bg-gaccent text-gsecondary p-3 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all hover:bg-gaccent-strong"
                aria-label="Abrir no Google Maps"
              >
                <Navigation size={20} />
              </button>
              {place.wazeUrl && (
                <button
                  onClick={() => window.open(place.wazeUrl!, '_blank')}
                  className="bg-[#05C8F8] text-white p-3 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all hover:bg-[#04a8d1]"
                  aria-label="Abrir no Waze"
                >
                  <span className="font-black text-[10px]">WAZE</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredPlaces.length === 0 && (
          <div className="text-center py-16">
            <Search className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-medium italic">Nenhum local encontrado.</p>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-gray-100">
          <div className="bg-gsurface p-5 rounded-2xl border border-dashed border-gaccent/20">
            <p className="text-xs text-gray-500 font-medium italic text-center leading-relaxed">
              Dica do Anfitrião: <br />
              <span className="text-gaccent font-bold not-italic text-sm">&ldquo;O Bistrô do Sol tem a melhor picanha da região!&rdquo;</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
