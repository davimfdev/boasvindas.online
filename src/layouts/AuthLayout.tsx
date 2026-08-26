import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen font-grotesk lg:grid-cols-2">
      <div className="flex flex-col justify-between bg-[#fdfdfb] px-6 py-10 sm:px-12 lg:px-20">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-[#0a0a0a]">
          boasvindas<span className="text-[#0d9488]">.</span>
        </Link>
        <div className="mx-auto w-full max-w-sm py-12">
          <Outlet />
        </div>
        <p className="text-xs text-black/35">© boasvindas.online</p>
      </div>

      <aside className="grain mesh-dark relative hidden overflow-hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity contrast-125"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80)' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_80%)]" />
        <blockquote className="font-display absolute bottom-16 left-12 right-12 text-balance text-3xl font-bold leading-tight text-white">
          &ldquo;Cada hóspede recebe um guia profissional — sem você repetir a mesma mensagem.&rdquo;
        </blockquote>
      </aside>
    </div>
  )
}
