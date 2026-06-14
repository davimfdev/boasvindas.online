'use client'

import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, MessageCircle, QrCode } from 'lucide-react'
import type { PageContent, Section } from '@/lib/blocks/schema'
import { BlockRenderer, type RenderCtx } from './blocks/BlockRenderer'
import { Icon } from './blocks/Icon'

interface GuestSiteProps {
  title: string
  whatsapp: string | null
  theme: string
  content: PageContent
}

function SectionView({ section, ctx }: { section: Section; ctx: RenderCtx }) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      {section.blocks.map((b) => (
        <BlockRenderer key={b.id} block={b} ctx={ctx} />
      ))}
    </div>
  )
}

export function GuestSite({ title, whatsapp, theme, content }: GuestSiteProps) {
  const ctx: RenderCtx = { whatsapp }
  // Safe non-null index: pageContentSchema enforces sections.min(1). Do not relax that guarantee.
  const [activeSectionId, setActiveSectionId] = useState<string>(content.sections[0].id)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pageUrl, setPageUrl] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const whatsappDigits = whatsapp?.replace(/\D/g, '') || ''
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => setScrolled(el.scrollTop > 20)
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setPageUrl(window.location.href)
  }, [])

  const isButtonsNav = content.nav === 'buttons'
  const activeSection =
    content.sections.find((s) => s.id === activeSectionId) ?? content.sections[0]

  return (
    <div
      ref={scrollRef}
      data-theme={theme}
      className={`guest-site h-screen overflow-y-auto flex flex-col bg-gbg text-gaccent-strong relative ${
        isButtonsNav ? '' : 'snap-y snap-mandatory'
      }`}
    >
      <header
        className={`sticky top-0 z-50 px-5 py-4 transition-all duration-300 border-b ${
          scrolled
            ? 'bg-white/90 backdrop-blur-md shadow-md border-gray-100'
            : 'bg-white border-transparent'
        }`}
      >
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
          <h1 className="font-serif font-bold text-gaccent text-lg shrink-0">
            {title.toUpperCase()}
          </h1>
          <button
            onClick={() => setIsQrOpen(true)}
            className="p-2 rounded-full transition-colors text-gaccent hover:bg-teal-50 shrink-0"
            aria-label="QR Code da página"
          >
            <QrCode size={24} />
          </button>
        </div>

        <nav aria-label="Seções" className="w-full max-w-5xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto">
          {content.sections.map((section) => {
            const isActive = section.id === activeSectionId
            const className = `whitespace-nowrap px-4 py-2 rounded-full transition-all flex items-center gap-2 text-sm font-bold ${
              isActive
                ? 'bg-gaccent text-gsecondary shadow-lg'
                : 'text-gaccent-strong hover:bg-gbg'
            }`
            const inner = (
              <>
                <Icon name={section.icon} size={16} />
                {section.title}
              </>
            )
            return isButtonsNav ? (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={className}
              >
                {inner}
              </button>
            ) : (
              <a key={section.id} href={`#${section.id}`} className={className}>
                {inner}
              </a>
            )
          })}
        </nav>
      </header>

      {isQrOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title">
          <div className="absolute inset-0 bg-gaccent-strong/60 backdrop-blur-sm" onClick={() => setIsQrOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full animate-slideUp">
            <button autoFocus onClick={() => setIsQrOpen(false)} className="absolute top-4 right-4 text-gray-300 hover:text-gaccent" aria-label="Fechar">
              <X size={24} />
            </button>
            <h2 id="qr-dialog-title" className="font-serif font-bold text-lg text-gaccent">Acesse no celular</h2>
            <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
              {pageUrl && <QRCodeSVG value={pageUrl} size={180} level="H" />}
            </div>
            <p className="text-[11px] text-gray-500 text-center leading-relaxed">Aponte a câmera para abrir esta página de boas-vindas.</p>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden flex flex-col items-center w-full">
        {isButtonsNav
          ? activeSection && <SectionView section={activeSection} ctx={ctx} />
          : content.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="w-full flex flex-col items-center justify-center min-h-[100svh] scroll-mt-24 snap-start py-12"
              >
                <SectionView section={section} ctx={ctx} />
              </section>
            ))}
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

      {whatsappUrl && (
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
    </div>
  )
}
