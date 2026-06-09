import { notFound } from 'next/navigation'
import { Playfair_Display } from 'next/font/google'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { GuestSite } from './_components/GuestSite'

export const revalidate = 60

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-guest-serif' })

async function getPage(slug: string) {
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1)
  return page ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return {}
  return {
    title: `${page.title} — Boas-vindas`,
    description: page.subtitle ?? `Guia de boas-vindas para hóspedes de ${page.title}.`,
  }
}

export default async function GuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  if (page.status !== 'published') {
    return (
      <div className={playfair.variable}>
        <ComingSoon title={page.title} theme={page.theme} />
      </div>
    )
  }

  return (
    <div className={playfair.variable}>
      <GuestSite title={page.title} whatsapp={page.whatsapp} theme={page.theme} />
    </div>
  )
}

function ComingSoon({ title, theme }: { title: string; theme: string }) {
  return (
    <main data-theme={theme} className="guest-site min-h-screen flex flex-col items-center justify-center gap-4 bg-gbg text-gaccent-strong px-6 text-center">
      <span className="bg-gsecondary/20 text-gaccent text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase">Em breve</span>
      <h1 className="font-serif font-bold text-3xl text-gaccent">{title}</h1>
      <p className="text-sm text-gray-500 max-w-sm">Esta página de boas-vindas ainda está sendo preparada pelo anfitrião. Volte em breve!</p>
    </main>
  )
}
