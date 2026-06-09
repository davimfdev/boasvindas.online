import { notFound } from 'next/navigation'
import { Inter, Playfair_Display } from 'next/font/google'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { GuestSite } from './_components/GuestSite'

const inter = Inter({ subsets: ['latin'], variable: '--font-guest-sans' })
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

  return (
    <div className={`${inter.variable} ${playfair.variable}`}>
      <GuestSite title={page.title} whatsapp={page.whatsapp} />
    </div>
  )
}
