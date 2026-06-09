'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ChevronLeft, Menu as MenuIcon, X, MessageCircle, Home as HomeIcon, Search as SearchIcon, QrCode } from 'lucide-react'
import { MENU_ITEMS, type GuestSection } from './guest-data'
import { SearchOverlay } from './SearchOverlay'
import { Home } from './Home'
import { Apartment } from './Apartment'
import { CheckIn } from './CheckIn'
import { Rules } from './Rules'
import { LocalGuide } from './LocalGuide'
import { CheckOut } from './CheckOut'
import { Emergency } from './Emergency'

interface GuestSiteProps {
  title: string
  whatsapp: string | null
  theme: string
}

export function GuestSite({ title, whatsapp, theme }: GuestSiteProps) {
  const [activeSection, setActiveSection] = useState<GuestSection>('home')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pageUrl, setPageUrl] = useState('')

  const whatsappDigits = whatsapp?.replace(/\D/g, '') || ''
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setPageUrl(window.location.href)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    setIsMenuOpen(false)
  }, [activeSection])

  const isHome = activeSection === 'home'
  const currentTitle = MENU_ITEMS.find((item) => item.id === activeSection)?.title || title

  function renderSection() {
    switch (activeSection) {
      case 'home': return <Home title={title} whatsappUrl={whatsappUrl} onNavigate={setActiveSection} onOpenSearch={() => setIsSearchOpen(true)} />
      case 'apartment': return <Apartment />
      case 'checkin': return <CheckIn />
      case 'rules': return <Rules />
      case 'local_guide': return <LocalGuide />
      case 'checkout': return <CheckOut whatsapp={whatsapp} whatsappUrl={whatsappUrl} />
      case 'emergency': return <Emergency />
    }
  }

  return (
    <div data-theme={theme} className="guest-site min-h-screen flex flex-col bg-gbg text-gaccent-strong relative">
      <header
        className={`sticky top-0 z-50 px-5 py-4 flex items-center justify-center transition-all duration-300 border-b ${
          isHome
            ? scrolled ? 'bg-gaccent/95 backdrop-blur-md shadow-lg border-gaccent/20' : 'bg-gaccent border-transparent'
            : 'bg-white/90 backdrop-blur-md shadow-md border-gray-100'
        }`}
      >
        <div className="w-full max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isHome && (
              <button
                onClick={() => setActiveSection('home')}
                className="p-1.5 hover:bg-teal-50 rounded-full transition-colors text-gaccent"
                aria-label="Voltar para o início"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className={`font-serif font-bold transition-all duration-300 flex flex-col items-start ${isHome ? 'text-gsecondary' : 'text-gaccent'}`}>
              <span className={isHome ? 'text-xl' : 'text-lg'}>
                {isHome ? title.toUpperCase() : currentTitle.toUpperCase()}
              </span>
              <span className={`text-[10px] tracking-[0.2em] font-black opacity-80 ${isHome ? 'text-white' : 'text-teal-400'}`}>
                APTO 101
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsQrOpen(true)}
              className={`p-2 rounded-full transition-colors ${isHome ? 'text-white hover:bg-white/10' : 'text-gaccent hover:bg-teal-50'}`}
              aria-label="QR Code da página"
            >
              <QrCode size={24} />
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`p-2 rounded-full transition-colors ${isHome ? 'text-white hover:bg-white/10' : 'text-gaccent hover:bg-teal-50'}`}
              aria-label="Pesquisar"
            >
              <SearchIcon size={24} />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full transition-colors ${isHome ? 'text-white hover:bg-white/10' : 'text-gaccent hover:bg-teal-50'}`}
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={26} /> : <MenuIcon size={26} />}
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onNavigate={setActiveSection} />

      {isQrOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-gaccent-strong/60 backdrop-blur-sm" onClick={() => setIsQrOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full animate-slideUp">
            <button onClick={() => setIsQrOpen(false)} className="absolute top-4 right-4 text-gray-300 hover:text-gaccent" aria-label="Fechar">
              <X size={24} />
            </button>
            <h2 className="font-serif font-bold text-lg text-gaccent">Acesse no celular</h2>
            <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
              {pageUrl && <QRCodeSVG value={pageUrl} size={180} level="H" />}
            </div>
            <p className="text-[11px] text-gray-500 text-center leading-relaxed">Aponte a câmera para abrir esta página de boas-vindas.</p>
          </div>
        </div>
      )}

      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-gaccent-strong/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="relative w-full max-w-[350px] bg-white h-full shadow-2xl p-8 flex flex-col gap-8 animate-slideInRight">
            <div className="flex justify-between items-center border-b pb-6 border-gray-100">
              <h2 className="text-2xl font-serif font-bold text-gaccent">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-gaccent"><X size={28} /></button>
            </div>
            <nav className="flex flex-col gap-3 overflow-y-auto">
              <button
                onClick={() => setActiveSection('home')}
                className={`text-left p-4 rounded-2xl transition-all flex items-center gap-4 ${isHome ? 'bg-gaccent text-gsecondary font-bold shadow-lg' : 'text-gaccent-strong hover:bg-gbg'}`}
              >
                Início
              </button>
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`text-left p-4 rounded-2xl transition-all flex items-center gap-4 ${activeSection === item.id ? 'bg-gaccent text-gsecondary font-bold shadow-lg' : 'text-gaccent-strong hover:bg-gbg'}`}
                >
                  <span className={`${activeSection === item.id ? 'text-gsecondary' : 'text-gaccent'} opacity-80`}>{item.icon}</span>
                  {item.title}
                </button>
              ))}
            </nav>
            <div className="mt-auto pt-8 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-[0.2em] font-bold">
              {title} • Cidade Digital, UF
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden flex flex-col items-center">
        <div className="w-full max-w-5xl">{renderSection()}</div>
      </main>

      <footer className="w-full bg-white border-t border-gray-100 py-12 px-6 mt-auto flex flex-col items-center">
        <div className="w-full max-w-5xl flex flex-col items-center text-center gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-gaccent font-serif font-bold text-xl uppercase tracking-tight">{title}</p>
            <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black">Anfitrião Profissional</p>
          </div>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366]/10 text-gaccent py-2 px-4 rounded-xl hover:bg-[#25D366]/20 transition-all font-bold inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} className="text-[#25D366]" />
              {whatsapp}
            </a>
          )}

          <div className="pt-8 border-t border-gray-50 w-full text-[9px] text-gray-300 uppercase tracking-[0.4em] font-black">
            {title} • Feito com boasvindas.online
          </div>
        </div>
      </footer>

      {whatsappUrl && activeSection !== 'emergency' && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-8 right-8 bg-[#25D366] text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white flex items-center justify-center"
          aria-label="Falar no WhatsApp"
        >
          <MessageCircle size={28} />
        </a>
      )}

      {!isHome && (
        <button
          onClick={() => setActiveSection('home')}
          className="fixed bottom-8 left-8 bg-gaccent text-gsecondary p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white flex items-center justify-center animate-slideUp"
          aria-label="Voltar ao início"
        >
          <HomeIcon size={28} />
        </button>
      )}
    </div>
  )
}
