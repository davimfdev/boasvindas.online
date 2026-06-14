'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PageContent } from '@/lib/blocks/schema'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutosaverOpts {
  delayMs: number
  save: (content: PageContent) => Promise<void>
  onStatus?: (status: SaveStatus) => void
}

export function createAutosaver({ delayMs, save, onStatus }: AutosaverOpts) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: PageContent | null = null
  return {
    schedule(content: PageContent) {
      latest = content
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        timer = null
        const toSave = latest!
        onStatus?.('saving')
        try { await save(toSave); onStatus?.('saved') }
        catch { onStatus?.('error') }
      }, delayMs)
    },
    cancel() { if (timer) clearTimeout(timer); timer = null },
  }
}

// React wrapper: schedules a save whenever `content` changes while `dirty`.
export function useAutosave(pageId: string, content: PageContent, dirty: boolean, onSaved: () => void) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const saver = useMemo(() => createAutosaver({
    delayMs: 1200,
    save: async (c) => {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: c }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        console.error('Autosave falhou:', res.status, body?.error ?? res.statusText)
        throw new Error('save failed')
      }
      onSaved()
    },
    onStatus: setStatus,
  }), [pageId, onSaved])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (dirty) saver.schedule(content)
  }, [content, dirty, saver])

  useEffect(() => () => saver.cancel(), [saver])
  return status
}
