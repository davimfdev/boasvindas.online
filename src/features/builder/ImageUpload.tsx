import { useRef, useState } from 'react'
import { ImageUp, Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

/** Mirrors the formats the API accepts, so the file picker offers only those. */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

/** Codes the API returns bare, without a message of their own. */
const FRIENDLY: Record<string, string> = {
  UNAUTHORIZED: 'Sua sessão expirou. Entre novamente para enviar imagens.',
  NOT_FOUND: 'Página não encontrada. Salve a página e tente de novo.',
  INTERNAL: 'Não foi possível enviar a imagem. Tente de novo.',
}

interface Props {
  /** Current image URL — pasted by hand or returned by a previous upload. */
  value: string
  /** Page the image belongs to; without it the API cannot check ownership. */
  pageId?: string
  onChange: (url: string) => void
}

export function ImageUpload({ value, pageId, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [isSending, setIsSending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(file: File | undefined) {
    if (!file) return
    if (!pageId) {
      setError('Abra a página no construtor para enviar imagens.')
      return
    }

    setIsSending(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('pageId', pageId)
      form.append('file', file)
      const { media } = await api.upload<{ media: { url: string } }>('/api/media/upload', form)
      onChange(media.url)
    } catch (err) {
      setError(toMessage(err))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {value && (
        <img
          src={value}
          alt="Pré-visualização da imagem"
          loading="lazy"
          className="h-20 w-full rounded border border-border object-cover"
        />
      )}

      <button
        type="button"
        disabled={isSending}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          void send(e.dataTransfer.files[0])
        }}
        className={`flex items-center justify-center gap-2 rounded border border-dashed px-3 py-3 text-xs transition-colors disabled:opacity-60 ${
          isDragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
        }`}
      >
        {isSending ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
        {isSending ? 'Enviando…' : 'Arraste uma imagem ou clique para enviar'}
      </button>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-label="Enviar imagem"
        onChange={(e) => {
          void send(e.target.files?.[0])
          // Lets the host re-pick the same file after a failed attempt.
          e.target.value = ''
        }}
      />

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function toMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Falha na conexão. Verifique sua internet e tente de novo.'
  return FRIENDLY[err.code] ?? err.message
}
