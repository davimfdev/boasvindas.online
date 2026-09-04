import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Palette as PaletteIcon, Sparkles } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { BlockType, PageContent } from '@/lib/blocks/schema'
import { isReauthSuccess, openReauthPopup } from '@/lib/reauth'
import { createBuilderStore, useBuilder } from './store'
import { useAutosave, type SaveStatus } from './useAutosave'
import { Palette } from './Palette'
import { Preview } from './Preview'
import { Inspector } from './Inspector'
import { SectionTabs } from './SectionTabs'
import { ThemePanel } from './ThemePanel'

interface BuilderProps {
  pageId: string
  title: string
  whatsapp: string | null
  theme: string
  slug?: string
  initialContent: PageContent
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: 'Tudo salvo',
  saving: 'Salvando…',
  saved: 'Salvo',
  error: 'Erro ao salvar',
  expired: 'Não salvo',
}

const STATUS_DOT: Record<SaveStatus, string> = {
  idle: 'bg-emerald-500',
  saving: 'bg-amber-400 animate-pulse',
  saved: 'bg-emerald-500',
  error: 'bg-red-500',
  expired: 'bg-red-500',
}

/**
 * Deliberately a banner and not a modal: the unsaved work only exists in this
 * tab's memory, so anything that blocks or navigates away destroys exactly what
 * it is meant to protect. Signing in happens in a popup, which shares the cookie
 * by origin and reports back, and the save is then retried from here.
 */
function SessionExpiredBanner({
  onReauth,
  onRetry,
  popupBlocked,
}: {
  onReauth: () => void
  onRetry: () => void
  popupBlocked: boolean
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-900"
    >
      <AlertTriangle className="size-4 shrink-0 text-red-600" />
      <div className="min-w-0 flex-1">
        <p>
          <strong className="font-semibold">Sua sessão expirou. As alterações atuais ainda não foram salvas.</strong>{' '}
          Revalide a sessão para continuar. Não feche nem recarregue esta aba: o que você editou
          desde o último salvamento só existe aqui.
        </p>
        {popupBlocked && (
          <p className="mt-1 font-medium">
            Não foi possível abrir a janela de login. Permita pop-ups e tente novamente.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onReauth}
        className="rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 active:scale-95"
      >
        Revalidar sessão
      </button>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-red-900 ring-1 ring-inset ring-red-300 transition-colors hover:bg-red-100"
      >
        Tentar salvar novamente
      </button>
    </div>
  )
}

export function Builder({ pageId, title, whatsapp, theme, slug, initialContent }: BuilderProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- store created once per mount
  const store = useMemo(() => createBuilderStore(initialContent), [])
  const [showTheme, setShowTheme] = useState(false)
  const content = useBuilder(store, (s) => s.content)
  const dirty = useBuilder(store, (s) => s.dirty)

  const onSaved = useCallback(() => store.getState().markSaved(), [store])
  const { status, retry } = useAutosave(pageId, content, dirty, onSaved)

  const reauthWindow = useRef<Window | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)

  const openReauth = useCallback(() => {
    const popup = openReauthPopup()
    reauthWindow.current = popup
    setPopupBlocked(!popup)
  }, [])

  // Only while expired: nothing else on the page has any business acting on
  // this message. Closing the popup without signing in simply never posts one,
  // so the builder stays expired with the work untouched.
  useEffect(() => {
    if (status !== 'expired') return
    const onMessage = (event: MessageEvent) => {
      if (!isReauthSuccess(event, reauthWindow.current)) return
      reauthWindow.current = null
      setPopupBlocked(false)
      void retry()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [status, retry])

  // The only thing standing between unsaved work and a reflex Ctrl+R. The
  // browser owns the dialog; nothing here may draw its own.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      // Both halves are needed: preventDefault is the modern spec, returnValue
      // is what older engines actually read to decide whether to prompt.
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)

    if (activeId.startsWith('palette:')) {
      store.getState().addBlock(activeId.slice('palette:'.length) as BlockType)
      return
    }

    if (activeId === over.id) return
    const state = store.getState()
    const section = state.content.sections.find((s) => s.id === state.activeSectionId)
    if (!section) return
    const toIndex = section.blocks.findIndex((b) => b.id === over.id)
    if (toIndex === -1) return
    state.moveBlock(activeId, toIndex)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-muted/20">
      {status === 'expired' && (
        <SessionExpiredBanner onReauth={openReauth} onRetry={retry} popupBlocked={popupBlocked} />
      )}

      <header className="flex items-center justify-between gap-4 border-b border-border/70 bg-card/70 px-5 py-2.5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#0d9488] to-[#0f766e] text-white shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <h1 className="font-display truncate text-base font-bold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setShowTheme((v) => !v)}
            aria-pressed={showTheme}
            className={[
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95',
              showTheme
                ? 'bg-[#0d9488]/12 text-[#0d9488] ring-1 ring-inset ring-[#0d9488]/30'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ].join(' ')}
          >
            <PaletteIcon className="size-3.5" />
            Tema
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
          {slug && (
            <Link
              to={`/${slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0d9488] to-[#0f766e] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-95"
            >
              <ExternalLink className="size-3.5" />
              Ver página
            </Link>
          )}
        </div>
      </header>

      <SectionTabs store={store} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={`grid flex-1 grid-cols-1 overflow-hidden ${showTheme ? 'md:grid-cols-[200px_1fr_280px_18rem]' : 'md:grid-cols-[200px_1fr_280px]'}`}>
          <aside className="overflow-auto border-r border-border/70 bg-card/40">
            <Palette store={store} />
          </aside>
          <Preview store={store} theme={theme} whatsapp={whatsapp} />
          <aside className="overflow-auto border-l border-border/70 bg-card/40">
            <Inspector store={store} />
          </aside>
          {showTheme && <ThemePanel store={store} />}
        </div>
      </DndContext>
    </div>
  )
}
