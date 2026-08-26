import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fdfdfb] px-6 text-center font-grotesk">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-black/40">Erro 404</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0a0a0a]">
        Página não encontrada
      </h1>
      <p className="max-w-sm text-black/55">
        O endereço que você abriu não existe ou foi removido pelo anfitrião.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-full bg-[#0a0a0a] px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        Voltar ao início
      </Link>
    </main>
  )
}
