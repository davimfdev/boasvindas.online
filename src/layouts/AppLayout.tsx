import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { LogoutButton } from '@/features/dashboard/LogoutButton'

export function AppLayout() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#f6f6f3] font-grotesk">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#fdfdfb]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link to="/app" className="font-display text-lg font-extrabold tracking-tight text-[#0a0a0a]">
            boasvindas<span className="text-[#0d9488]">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-black/50 sm:inline">{user?.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
