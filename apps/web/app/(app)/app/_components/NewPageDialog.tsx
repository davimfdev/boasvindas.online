'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { generateSlug } from '@/lib/utils'

const THEMES = [
  { value: 'modern', label: 'Modern', hint: 'Clean, Inter, tons de teal', swatch: ['#0d9488', '#fbbf24'] },
  { value: 'rustic', label: 'Rustic', hint: 'Playfair, paleta terra/madeira', swatch: ['#5d4017', '#d99a2b'] },
] as const

export function NewPageDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [theme, setTheme] = useState<'modern' | 'rustic'>('modern')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const slugPreview = slug.trim() || generateSlug(title) || 'minha-pagina'

  function reset() {
    setTitle('')
    setSlug('')
    setWhatsapp('')
    setTheme('modern')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, slug: slug.trim() || undefined, whatsapp: whatsapp.trim() || undefined, theme }),
    })
    setLoading(false)
    if (res.ok) {
      setOpen(false)
      reset()
      router.refresh()
      return
    }
    const data = await res.json().catch(() => null)
    setError(data?.error?.message ?? 'Não foi possível criar a página. Tente novamente.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Nova página
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar página</DialogTitle>
          <DialogDescription>
            Endereço público: <span className="font-mono">/{slugPreview}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Suíte Vista Mar"
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (opcional)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="gerado a partir do título"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
            <Input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+55 11 99999-9999"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tema</legend>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <label
                  key={t.value}
                  className="flex cursor-pointer flex-col gap-1 rounded-md border p-3 has-checked:border-[var(--accent)] has-checked:ring-1 has-checked:ring-[var(--accent)]"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="radio"
                      name="theme"
                      value={t.value}
                      checked={theme === t.value}
                      onChange={() => setTheme(t.value)}
                    />
                    {t.label}
                    <span className="ml-auto flex gap-1" aria-hidden>
                      {t.swatch.map((c) => (
                        <span key={c} className="size-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{t.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando…' : 'Criar página'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
