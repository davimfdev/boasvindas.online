import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
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
import { api, ApiError } from '@/lib/api'

const THEMES = [
  { value: 'modern', label: 'Modern', hint: 'Clean, tons de teal', gradient: 'from-[#0d9488] to-[#5eead4]', swatch: ['#0d9488', '#fbbf24'] },
  { value: 'rustic', label: 'Rustic', hint: 'Playfair, terra e madeira', gradient: 'from-[#5d4017] to-[#d99a2b]', swatch: ['#5d4017', '#d99a2b'] },
] as const

interface NewPageDialogProps {
  /** Replaces the server-component refresh the Next.js router used to trigger. */
  onCreated: () => void
}

export function NewPageDialog({ onCreated }: NewPageDialogProps) {
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
    try {
      await api.post('/api/pages', {
        title,
        slug: slug.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        theme,
      })
      setOpen(false)
      reset()
      onCreated()
    } catch (err) {
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : 'Não foi possível criar a página. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
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
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((t) => (
                <label
                  key={t.value}
                  className="group cursor-pointer overflow-hidden rounded-xl border-2 transition-all has-checked:border-[#0d9488] has-checked:shadow-md"
                >
                  <input
                    type="radio"
                    name="theme"
                    value={t.value}
                    checked={theme === t.value}
                    onChange={() => setTheme(t.value)}
                    className="sr-only"
                  />
                  <div className={`relative h-16 bg-gradient-to-br ${t.gradient}`}>
                    <div className="absolute bottom-2 left-2 h-5 w-10 rounded-sm bg-white/85" />
                    <div className="absolute bottom-2 left-14 h-5 w-5 rounded-full bg-white/85" />
                  </div>
                  <div className="flex items-center justify-between gap-1 p-3">
                    <div>
                      <p className="text-sm font-semibold">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.hint}</p>
                    </div>
                    {theme === t.value && <Check className="size-4 shrink-0 text-[#0d9488]" />}
                  </div>
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
