import { useState } from 'react'
import { Globe, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

interface PublishToggleProps {
  pageId: string
  published: boolean
  /** Replaces the server-component refresh the Next.js router used to trigger. */
  onChanged: () => void
}

export function PublishToggle({ pageId, published, onChanged }: PublishToggleProps) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    try {
      await api.post(`/api/pages/${pageId}/publish`)
      onChanged()
    } catch {
      // Keeps the previous state visible; the dashboard reload will resync.
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={published ? 'ghost' : 'default'} size="sm" disabled={loading} onClick={handleToggle}>
      {published ? <EyeOff className="size-4" /> : <Globe className="size-4" />}
      {published ? 'Despublicar' : 'Publicar'}
    </Button>
  )
}
