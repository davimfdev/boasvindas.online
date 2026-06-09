'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
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

const THEMES = [
  { value: 'modern', label: 'Modern', hint: 'Clean, Inter, tons de teal', swatch: ['#0d9488', '#fbbf24'] },
  { value: 'rustic', label: 'Rustic', hint: 'Playfair, paleta terra/madeira', swatch: ['#5d4017', '#d99a2b'] },
] as const

interface EditPageDialogProps {
  page: { id: string; slug: string; title: string; whatsapp: string | null; theme: string }
}

export function EditPageDialog({ page }: EditPageDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(page.title)
  const [whatsapp, setWhatsapp] = useState(page.whatsapp ?? '')
  const [theme, setTheme] = useState<'modern' | 'rustic'>(page.theme === 'rustic' ? 'rustic' : 'modern')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch(`/api/pages/${page.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, whatsapp: whatsapp.trim() || null, theme }),
    })
    setLoading(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
      return
    }
    const data = await res.json().catch(() => null)
    setError(data?.error?.message ?? 'Não foi possível salvar. Tente novamente.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="size-4" />
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar página</DialogTitle>
          <DialogDescription>
            Endereço público: <span className="font-mono">/{page.slug}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-whatsapp">WhatsApp</Label>
            <Input id="edit-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+55 11 99999-9999" />
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
                    <input type="radio" name="edit-theme" value={t.value} checked={theme === t.value} onChange={() => setTheme(t.value)} />
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
              {loading ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
