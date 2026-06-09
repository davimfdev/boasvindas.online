'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PublishToggleProps {
  pageId: string
  published: boolean
}

export function PublishToggle({ pageId, published }: PublishToggleProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const res = await fetch(`/api/pages/${pageId}/publish`, { method: 'POST' })
    setLoading(false)
    if (res.ok) router.refresh()
  }

  return (
    <Button variant={published ? 'ghost' : 'default'} size="sm" disabled={loading} onClick={handleToggle}>
      {published ? <EyeOff className="size-4" /> : <Globe className="size-4" />}
      {published ? 'Despublicar' : 'Publicar'}
    </Button>
  )
}
