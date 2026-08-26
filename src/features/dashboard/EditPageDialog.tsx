import { useState } from 'react'
import { Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
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
  { value: 'modern', label: 'Modern', hint: 'Clean, tons de teal', gradient: 'from-[#0d9488] to-[#5eead4]' },
  { value: 'rustic', label: 'Rustic', hint: 'Playfair, terra e madeira', gradient: 'from-[#5d4017] to-[#d99a2b]' },
] as const

interface EditPageDialogProps {
  page: { id: string; slug: string; title: string; whatsapp: string | null; theme: string }
  /** Replaces the server-component refresh the Next.js router used to trigger. */
  onSaved: () => void
}

export function EditPageDialog({ page, onSaved }: EditPageDialogProps) {
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
    try {
      await api.put(`/api/pages/${page.id}`, {
        title,
        whatsapp: whatsapp.trim() || null,
        theme,
      })
      setOpen(false)
      onSaved()
    } catch (err) {
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : 'Não foi possível salvar. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
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
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((t) => (
                <label
                  key={t.value}
                  className="group cursor-pointer overflow-hidden rounded-xl border-2 transition-all has-checked:border-[#0d9488] has-checked:shadow-md"
                >
                  <input
                    type="radio"
                    name="edit-theme"
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
              {loading ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
