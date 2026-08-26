import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { resolvePageContent } from '@/lib/blocks/resolve-content'
import type { HostPage } from '@/lib/types'
import { Builder } from '@/features/builder/Builder'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function EditPage() {
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState<HostPage | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    if (!id) return
    let active = true
    api
      .get<{ page: HostPage }>(`/api/pages/${id}`)
      .then((data) => {
        if (!active) return
        setPage(data.page)
        setStatus('ready')
      })
      .catch(() => { if (active) setStatus('missing') })
    return () => { active = false }
  }, [id])

  if (status === 'loading') {
    return <p className="py-20 text-center font-grotesk text-black/40">Carregando construtor…</p>
  }
  if (status === 'missing' || !page) return <NotFoundPage />

  return (
    <Builder
      pageId={page.id}
      title={page.title}
      whatsapp={page.whatsapp}
      theme={page.theme}
      slug={page.slug}
      initialContent={resolvePageContent(page.content)}
    />
  )
}
