'use client'

import React from 'react'
import { Calendar, MessageCircle, MapPin, Search } from 'lucide-react'
import { MENU_ITEMS, type GuestSection } from './guest-data'

interface HomeProps {
  title: string
  whatsappUrl: string | null
  onNavigate: (section: GuestSection) => void
  onOpenSearch: () => void
}

function GuestLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" rx="20" fill="white" />
      <path d="M30 30 L70 70 M70 30 L30 70" stroke="#0d9488" strokeWidth="12" strokeLinecap="round" />
      <path d="M35 25 L50 15 L65 25" fill="none" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Home({ title, whatsappUrl, onNavigate, onOpenSearch }: HomeProps) {
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <div className="animate-fadeIn">
      <div className="bg-[#0d9488] text-white px-6 pt-6 pb-12 rounded-b-[50px] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#fbbf24]/20 rounded-full blur-3xl"></div>

        <div className="flex justify-between items-center mb-8 relative z-10">
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#fbbf24]/30 text-white text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase border border-white/20">APTO 101</span>
            </div>
            <h2 className="text-xl text-white/90 font-medium tracking-tight">Seja bem-vindo!</h2>
            <p className="text-4xl font-serif font-bold mt-1 text-[#fbbf24]">{title}</p>
          </div>
          <div className="bg-white p-1 rounded-3xl shadow-lg flex items-center justify-center aspect-square w-20 h-20 overflow-hidden">
            <GuestLogo className="w-full h-full" />
          </div>
        </div>

        <div className="mb-8 relative z-10">
          <button
            onClick={onOpenSearch}
            className="w-full bg-white/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 text-white border border-white/30 hover:bg-white/30 transition-all text-left shadow-lg group"
          >
            <Search size={22} className="text-[#fbbf24] group-hover:scale-110 transition-transform" />
            <span className="text-white/80 font-medium">O que você está procurando?</span>
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide relative z-10">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl min-w-[150px] border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-[#fbbf24]" />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Data de hoje</span>
            </div>
            <p className="text-xs font-semibold capitalize">{today}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl min-w-[150px] border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Cidade Digital</span>
            </div>
            <p className="text-xs font-semibold">28°C • Ensolarado</p>
          </div>
        </div>
      </div>

      {whatsappUrl && (
        <div className="px-6 -mt-8 relative z-20">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white p-6 rounded-3xl shadow-xl flex items-center justify-between border border-[#0d9488]/10 active:scale-[0.98] transition-all no-underline"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#25D366] text-white p-4 rounded-2xl shadow-lg">
                <MessageCircle size={28} />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg text-[#0d9488]">Dúvidas? Fale Conosco</p>
                <p className="text-sm text-gray-500">Estamos prontos para ajudar</p>
              </div>
            </div>
            <div className="bg-[#0d9488]/5 p-2 rounded-full text-[#0d9488]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </div>
          </a>
        </div>
      )}

      <div className="px-6 py-10 flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-3xl shadow-sm hover:shadow-md border border-gray-100 transition-all active:scale-[0.98] text-center group min-w-[130px] shrink-0 h-32"
          >
            <div className="bg-[#f0fdfa] text-[#0d9488] p-3 rounded-2xl group-hover:bg-[#fbbf24] group-hover:text-white transition-colors duration-300">
              {React.cloneElement(item.icon as React.ReactElement<{ size?: number }>, { size: 24 })}
            </div>
            <h3 className="font-bold text-[11px] text-[#0d9488] leading-tight uppercase tracking-wider">{item.title}</h3>
          </button>
        ))}
      </div>

      <div className="px-6 pb-14">
        <div className="bg-white p-5 rounded-2xl flex items-center gap-4 border border-gray-100 shadow-sm">
          <div className="bg-[#0d9488]/5 p-3 rounded-xl text-[#0d9488]">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">Localização</p>
            <p className="text-xs text-gray-700 font-semibold">Parque do Sol • Apto 101</p>
            <p className="text-[10px] text-gray-400">Bairro das Flores, Cidade Digital - UF</p>
          </div>
        </div>
      </div>
    </div>
  )
}
