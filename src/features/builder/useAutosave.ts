import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import type { PageContent } from '@/lib/blocks/schema'

/**
 * `expired` is separate from `error` because the two need opposite treatment: a
 * 500 or a dropped connection may well succeed on the next keystroke, while an
 * expired session will not succeed again until someone signs in. Retrying it on
 * every edit would only spend requests and keep telling the host "Salvando…"
 * about work that is not being saved.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'expired'

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
        catch (err) { onStatus?.(isSessionExpired(err) ? 'expired' : 'error') }
      }, delayMs)
    },
    cancel() { if (timer) clearTimeout(timer); timer = null },
  }
}

/** The one failure the host cannot fix by waiting. */
export function isSessionExpired(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.code === 'UNAUTHORIZED')
}

export interface Autosave {
  status: SaveStatus
  /** Saves the current content once, on demand. Only offered while expired. */
  retry: () => Promise<void>
}

// React wrapper: schedules a save whenever `content` changes while `dirty`.
export function useAutosave(
  pageId: string,
  content: PageContent,
  dirty: boolean,
  onSaved: () => void,
): Autosave {
  const [status, setStatus] = useState<SaveStatus>('idle')

  const save = useCallback(async (c: PageContent) => {
    await api.put(`/api/pages/${pageId}`, { content: c })
    onSaved()
  }, [pageId, onSaved])

  const saver = useMemo(
    () => createAutosaver({ delayMs: 1200, save, onStatus: setStatus }),
    [save],
  )

  // Read inside the scheduling effect without making it a dependency: reacting
  // to the status it sets itself would reschedule the save it just finished.
  const statusRef = useRef(status)
  statusRef.current = status

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    // Sticky: once the session is gone, editing must not queue more attempts.
    if (statusRef.current === 'expired') return
    if (dirty) saver.schedule(content)
  }, [content, dirty, saver])

  // A save scheduled while the doomed one was in flight would still fire after
  // the 401 landed. Dropping it here is what makes `expired` truly sticky.
  useEffect(() => { if (status === 'expired') saver.cancel() }, [status, saver])

  useEffect(() => () => saver.cancel(), [saver])

  const contentRef = useRef(content)
  contentRef.current = content

  const retry = useCallback(async () => {
    // Anything already queued would send stale content over the fresh attempt.
    saver.cancel()
    setStatus('saving')
    try {
      await save(contentRef.current)
      setStatus('saved')
    } catch (err) {
      setStatus(isSessionExpired(err) ? 'expired' : 'error')
    }
  }, [save, saver])

  return { status, retry }
}
