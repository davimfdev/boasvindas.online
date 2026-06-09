import Link from 'next/link'
import { MessageCircle, QrCode, Palette, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { icon: MessageCircle, title: 'WhatsApp direto', desc: 'Botão flutuante para o hóspede falar com você a qualquer momento.' },
  { icon: QrCode, title: 'QR Code pronto', desc: 'Imprima o código e cole no apartamento — acesso instantâneo ao guia.' },
  { icon: Palette, title: 'Temas elegantes', desc: 'Escolha entre estilos prontos e publique em segundos.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f0fdfa] text-[#134e4a]">
      <header className="border-b border-[#0d9488]/10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold">
            boasvindas<span className="text-[#0d9488]">.online</span>
          </span>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>Entrar</Button>
            <Button size="sm" render={<Link href="/cadastro" />}>Criar conta</Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <span className="inline-block rounded-full bg-[#fbbf24]/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#0d9488]">
            Para anfitriões
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Páginas de boas-vindas para seus hóspedes
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#134e4a]/70">
            Crie um guia digital com Wi-Fi, check-in, regras e dicas locais. Compartilhe por link ou QR Code.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" render={<Link href="/cadastro" />}>
              Criar minha página
              <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" size="lg" render={<Link href="/login" />}>Já tenho conta</Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[#0d9488]/10 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-xl bg-[#f0fdfa] p-3 text-[#0d9488]">
                  <f.icon className="size-6" />
                </div>
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-[#134e4a]/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0d9488]/10 bg-white py-8 text-center text-xs text-[#134e4a]/50">
        boasvindas.online — guias de boas-vindas para hospedagem
      </footer>
    </div>
  )
}
