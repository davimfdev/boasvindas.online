'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowUpRight, MessageCircle, QrCode, Palette, KeyRound, MapPin } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const MARQUEE = ['Wi-Fi', 'Check-in', 'Regras da casa', 'Guia local', 'Check-out', 'Emergência', 'QR Code', 'WhatsApp']

const REVEAL = 'Um guia digital completo para o seu hóspede — do Wi-Fi à dica de restaurante — pronto em minutos e acessível por um único link.'.split(' ')

export default function HomePage() {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.from('[data-hero]', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12 })

    gsap.utils.toArray<HTMLElement>('.reveal-word').forEach((word) => {
      gsap.fromTo(word, { opacity: 0.12 }, {
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: word, start: 'top 85%', end: 'top 55%', scrub: true },
      })
    })

    gsap.utils.toArray<HTMLElement>('[data-bento]').forEach((card) => {
      gsap.from(card, {
        y: 60, opacity: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 90%' },
      })
    })

    const showcase = root.current?.querySelector('[data-showcase]')
    if (showcase) {
      gsap.fromTo(showcase, { scale: 0.82 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: showcase, start: 'top 90%', end: 'top 35%', scrub: true },
      })
    }
  }, { scope: root })

  return (
    <main ref={root} className="overflow-x-hidden w-full max-w-full bg-[#fdfdfb] text-[#0a0a0a] font-grotesk">
      {/* Floating glass pill nav */}
      <nav className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="flex w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-white/40 bg-white/70 px-3 py-2 pl-5 shadow-lg shadow-black/5 backdrop-blur-xl">
          <span className="font-display text-lg font-extrabold tracking-tight">
            boasvindas<span className="text-[#0d9488]">.</span>
          </span>
          <div className="hidden items-center gap-7 text-sm text-black/60 sm:flex">
            <a href="#recursos" className="transition-colors hover:text-black">Recursos</a>
            <a href="#como" className="transition-colors hover:text-black">Como funciona</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:text-black sm:block">
              Entrar
            </Link>
            <Link href="/cadastro" className="rounded-full bg-[#0a0a0a] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105">
              Criar conta
            </Link>
          </div>
        </div>
      </nav>

      {/* ATTENTION — cinematic hero */}
      <section className="relative grain mesh-dark flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity contrast-125"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1920&q=80)" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_75%)]" />

        <div className="relative z-10 flex flex-col items-center">
          <p data-hero className="mb-6 text-xs font-semibold uppercase tracking-[0.35em] text-white/50">Para anfitriões</p>
          <h1 data-hero className="font-display max-w-5xl text-balance text-white" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.02, fontWeight: 800 }}>
            A recepção do seu apartamento, agora em um link.
          </h1>
          <p data-hero className="mt-7 max-w-xl text-lg text-white/70">
            Monte uma página de boas-vindas com tudo que o hóspede precisa saber. Compartilhe por QR Code ou WhatsApp.
          </p>
          <div data-hero className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/cadastro" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[#0a0a0a] transition-transform hover:scale-105">
              Criar minha página
              <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="/login" className="inline-flex items-center rounded-full border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Infinite marquee */}
      <section className="border-y border-black/10 bg-[#0a0a0a] py-6">
        <div className="flex w-max animate-marquee gap-4">
          {[...MARQUEE, ...MARQUEE].map((word, i) => (
            <span key={i} className="flex items-center gap-4 whitespace-nowrap font-display text-2xl font-bold text-white/80">
              {word}
              <span className="text-[#0d9488]">/</span>
            </span>
          ))}
        </div>
      </section>

      {/* DESIRE — scrubbing text reveal */}
      <section id="como" className="mx-auto max-w-4xl px-6 py-32 md:py-48">
        <p className="font-display text-3xl font-bold leading-snug tracking-tight md:text-5xl md:leading-[1.15]">
          {REVEAL.map((word, i) => (
            <span key={i} className="reveal-word inline-block">{word}&nbsp;</span>
          ))}
        </p>
      </section>

      {/* INTEREST — gapless bento */}
      <section id="recursos" className="mx-auto max-w-6xl px-6 pb-32 md:pb-48">
        <h2 className="font-display mb-12 max-w-2xl text-balance text-4xl font-extrabold tracking-tight md:text-6xl">
          Tudo que o hóspede pergunta, já respondido.
        </h2>
        <div className="grid auto-rows-[minmax(170px,auto)] grid-flow-dense grid-cols-2 gap-3 md:grid-cols-6">
          <article data-bento className="group relative col-span-2 row-span-2 overflow-hidden rounded-3xl bg-[#0a0a0a] p-8 text-white md:col-span-3">
            <div className="absolute inset-0 bg-cover bg-center opacity-30 grayscale transition-all duration-700 group-hover:scale-105 group-hover:opacity-40" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80)" }} />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <MessageCircle className="size-8 text-[#fbbf24]" />
              <div>
                <h3 className="font-display text-3xl font-bold">WhatsApp flutuante</h3>
                <p className="mt-2 max-w-xs text-white/65">O hóspede fala com você em um toque, de qualquer seção do guia.</p>
              </div>
            </div>
          </article>

          <article data-bento className="group col-span-2 row-span-2 overflow-hidden rounded-3xl border border-black/10 bg-white p-8 md:col-span-3">
            <QrCode className="size-8 text-[#0d9488]" />
            <h3 className="font-display mt-5 text-2xl font-bold">QR Code pronto pra imprimir</h3>
            <p className="mt-2 text-black/60">Cole no apartamento. A câmera abre o guia completo na hora — Wi-Fi, regras, dicas.</p>
            <div className="mt-6 inline-flex rounded-2xl border border-black/10 bg-[#f6f6f3] p-4">
              <QrCode className="size-20 text-[#0a0a0a]" strokeWidth={1.2} />
            </div>
          </article>

          <article data-bento className="group col-span-2 overflow-hidden rounded-3xl bg-[#0d9488] p-7 text-white md:col-span-2">
            <Palette className="size-7" />
            <h3 className="font-display mt-5 text-xl font-bold leading-tight">Temas elegantes</h3>
            <p className="mt-2 text-sm text-white/80">Modern ou Rustic, com um clique.</p>
          </article>

          <article data-bento className="group col-span-1 overflow-hidden rounded-3xl border border-black/10 bg-white p-7 md:col-span-2">
            <KeyRound className="size-7 text-[#0d9488]" />
            <h3 className="font-display mt-5 text-xl font-bold leading-tight">Check-in guiado</h3>
            <p className="mt-2 text-sm text-black/60">Senha, Wi-Fi e instruções de entrada, passo a passo.</p>
          </article>

          <article data-bento className="group col-span-1 overflow-hidden rounded-3xl bg-[#fbbf24] p-7 text-[#0a0a0a] md:col-span-2">
            <MapPin className="size-7" />
            <h3 className="font-display mt-5 text-xl font-bold leading-tight">Guia local com mapa e Waze</h3>
            <p className="mt-2 text-sm text-black/70">Restaurantes, mercados e pontos turísticos por perto.</p>
          </article>
        </div>
      </section>

      {/* Image scale + fade showcase */}
      <section className="mx-auto max-w-6xl px-6 pb-32 md:pb-48">
        <div data-showcase className="relative aspect-[16/9] overflow-hidden rounded-[2rem] border border-black/10">
          <div className="absolute inset-0 bg-cover bg-center contrast-110" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1920&q=80)" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="font-display absolute bottom-8 left-8 max-w-md text-2xl font-bold text-white md:text-4xl">
            Hospedagem que parece profissional desde o primeiro contato.
          </p>
        </div>
      </section>

      {/* ACTION — massive CTA */}
      <section className="grain mesh-dark relative overflow-hidden px-6 py-32 text-center md:py-48">
        <div className="relative z-10 mx-auto max-w-4xl">
          <h2 className="font-display text-balance text-white" style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', lineHeight: 1.03, fontWeight: 800 }}>
            Crie a sua primeira página hoje.
          </h2>
          <Link href="/cadastro" className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-lg font-semibold text-[#0a0a0a] transition-transform hover:scale-105">
            Começar agora
            <ArrowUpRight className="size-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#fdfdfb] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-lg font-extrabold">boasvindas<span className="text-[#0d9488]">.</span></span>
          <p className="text-sm text-black/40">Guias de boas-vindas para hospedagem</p>
          <div className="flex gap-6 text-sm text-black/60">
            <Link href="/login" className="hover:text-black">Entrar</Link>
            <Link href="/cadastro" className="hover:text-black">Criar conta</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
