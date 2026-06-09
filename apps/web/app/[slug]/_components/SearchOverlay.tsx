'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Search as SearchIcon, X, MapPin, Home, Key, ClipboardList, PhoneCall, ChevronRight, Building } from 'lucide-react'
import { MENU_ITEMS, LOCAL_PLACES, EMERGENCY_CONTACTS, type GuestSection } from './guest-data'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (section: GuestSection) => void
}

interface SearchResult {
  title: string
  description?: string
  section: GuestSection
  icon: React.ReactNode
  category?: string
  type: 'menu' | 'place' | 'emergency' | 'static'
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function SearchOverlay({ isOpen, onClose, onNavigate }: SearchOverlayProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
      setQuery('')
    }
  }, [isOpen])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const normalizedQuery = normalize(query)

    const allItems: SearchResult[] = [
      ...MENU_ITEMS.map((item) => ({ title: item.title, description: item.description, section: item.id, icon: item.icon, type: 'menu' as const })),
      ...LOCAL_PLACES.map((place) => ({ title: place.name, description: place.address, section: 'local_guide' as GuestSection, category: place.category, icon: <MapPin size={20} />, type: 'place' as const })),
      ...EMERGENCY_CONTACTS.map((contact) => ({ title: contact.name, description: contact.number, section: 'emergency' as GuestSection, icon: <PhoneCall size={20} />, type: 'emergency' as const })),
      { title: 'Senha do Wi-Fi / Internet', description: 'Dados de acesso e senha da rede do condomínio', section: 'apartment', icon: <Home size={20} />, type: 'static' },
      { title: 'Senha da Porta / Fechadura', description: 'Senha pessoal e intransferível (a recepção não tem acesso)', section: 'checkin', icon: <Key size={20} />, type: 'static' },
      { title: 'Segurança / Privacidade', description: 'Informações sobre a privacidade da sua senha', section: 'checkin', icon: <Key size={20} />, type: 'static' },
      { title: 'Ar Condicionado', description: 'Como usar o controle do AC', section: 'apartment', icon: <Home size={20} />, type: 'static' },
      { title: 'Netflix / TV', description: 'Instruções para canais e streaming', section: 'apartment', icon: <Home size={20} />, type: 'static' },
      { title: 'Cafeteira', description: 'Manual da máquina Três Corações', section: 'apartment', icon: <Home size={20} />, type: 'static' },
      { title: 'Sofá-Cama', description: 'Como abrir e fechar o sofá', section: 'apartment', icon: <Home size={20} />, type: 'static' },
      { title: 'Lixo / Descarte', description: 'Onde descartar os resíduos', section: 'rules', icon: <ClipboardList size={20} />, type: 'static' },
      { title: 'Fumo / Cigarro', description: 'Regras sobre fumo no apartamento', section: 'rules', icon: <ClipboardList size={20} />, type: 'static' },
      { title: 'Pets / Animais', description: 'Regras para trazer seu animal de estimação', section: 'rules', icon: <ClipboardList size={20} />, type: 'static' },
      { title: 'Piscina (Mezanino)', description: 'Horários e regras da piscina (06:00 às 23:00)', section: 'apartment', icon: <Building size={20} />, type: 'static' },
      { title: 'Academia & SmartStore', description: 'Academia e loja de conveniência 24h no Mezanino', section: 'apartment', icon: <Building size={20} />, type: 'static' },
      { title: 'Sauna (Mezanino)', description: 'Horários da sauna (09:00 às 21:00) e chave na recepção', section: 'apartment', icon: <Building size={20} />, type: 'static' },
      { title: 'Tensão de Energia / Voltagem', description: 'Todas as tomadas do apartamento são 220V', section: 'apartment', icon: <Home size={20} />, type: 'static' },
      { title: 'Número do Apartamento', description: 'Unidade 101 no Edifício Parque do Sol', section: 'checkin', icon: <Home size={20} />, type: 'static' },
    ]

    return allItems
      .filter((item) => normalize(`${item.title} ${item.description || ''} ${item.category || ''}`).includes(normalizedQuery))
      .slice(0, 10)
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white animate-fadeIn">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="O que você está procurando?"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-[#f1b418] outline-none text-[#3d2b10]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
              <X size={16} />
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-[#5d4017] font-bold text-sm px-2">Fechar</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!query.trim() ? (
          <div className="text-center pt-10">
            <SearchIcon className="mx-auto text-gray-100 mb-4" size={64} />
            <p className="text-gray-400 text-sm">Digite algo para pesquisar no guia</p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {['Senha', 'Wi-Fi', 'Lazer', 'Netflix', 'Restaurante', 'Lixo'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="px-4 py-2 bg-gray-50 text-gray-500 rounded-full text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2 mb-2">Resultados</p>
            {results.map((result, idx) => (
              <button
                key={`${result.type}-${idx}`}
                onClick={() => {
                  onNavigate(result.section)
                  onClose()
                }}
                className="w-full flex items-center gap-4 p-4 bg-white border border-gray-50 rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98] text-left shadow-sm mb-2 group"
              >
                <div className="bg-[#fcfaf7] text-[#5d4017] p-3 rounded-xl group-hover:bg-[#f1b418] group-hover:text-white transition-colors">
                  {result.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#5d4017] text-sm leading-tight">{result.title}</h4>
                  {result.description && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{result.description}</p>}
                  {result.category && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-400 text-[9px] font-black uppercase tracking-wider rounded">
                      {result.category}
                    </span>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-200 group-hover:text-[#f1b418] transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center pt-10">
            <X className="mx-auto text-gray-100 mb-4" size={64} />
            <p className="text-gray-400 text-sm">Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  )
}
