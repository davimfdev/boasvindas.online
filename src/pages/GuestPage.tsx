import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { PublicPage } from '@/lib/types'
import { GuestSite } from '@/features/guest/GuestSite'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function GuestPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<PublicPage | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    if (!slug) return
    let active = true
    api
      .get<{ page: PublicPage }>(`/api/public/pages/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!active) return
        setPage(data.page)
        setStatus('ready')
      })
      .catch(() => { if (active) setStatus('missing') })
    return () => { active = false }
  }, [slug])

  // Replaces generateMetadata: the title is set once the page data arrives.
  useEffect(() => {
    if (!page) return
    const previous = document.title
    document.title = `${page.title} — Boas-vindas`
    return () => { document.title = previous }
  }, [page])

  if (status === 'loading') {
    return <div className="guest-site min-h-screen bg-gbg" />
  }
  if (status === 'missing' || !page) return <NotFoundPage />

  if (page.status !== 'published' || !page.content) {
    return <ComingSoon title={page.title} theme={page.theme} />
  }

  return (
    <GuestSite
      title={page.title}
      whatsapp={page.whatsapp ?? null}
      theme={page.theme}
      content={page.content}
    />
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
