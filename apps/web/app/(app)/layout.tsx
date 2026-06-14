import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { LogoutButton } from './_components/LogoutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="min-h-screen bg-[#f6f6f3] font-grotesk">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#fdfdfb]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/app" className="font-display text-lg font-extrabold tracking-tight text-[#0a0a0a]">
            boasvindas<span className="text-[#0d9488]">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-black/50 sm:inline">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
