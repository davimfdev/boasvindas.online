import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import type { SaveStatus } from '../useAutosave'
import type { PageContent } from '@/lib/blocks/schema'

// The banner is driven purely by the save status, so the status is injected
// here rather than provoked through a real request.
const { autosaveMock, retryMock } = vi.hoisted(() => ({
  // `markSaved` is the real callback the Builder hands the hook, captured so a
  // test can settle the store the way a successful save does.
  autosaveMock: { status: 'idle' as SaveStatus, markSaved: null as (() => void) | null },
  retryMock: vi.fn(),
}))

vi.mock('../useAutosave', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../useAutosave')>()
  return {
    ...actual,
    useAutosave: (_pageId: string, _content: unknown, _dirty: boolean, onSaved: () => void) => {
      autosaveMock.markSaved = onSaved
      return { status: autosaveMock.status, retry: retryMock }
    },
  }
})

const { Builder } = await import('../Builder')

const content: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } } ] },
    { id: 's2', title: 'Wi-Fi', icon: 'Wifi', blocks: [] },
  ],
}

const SESSION_WARNING = /Sua sessão expirou/

beforeEach(() => {
  autosaveMock.status = 'idle'
  autosaveMock.markSaved = null
  retryMock.mockReset()
})

function renderBuilder() {
  return render(
    <Builder pageId="p1" title="Casa" whatsapp={null} theme="modern" initialContent={content} />
  )
}

/** Clicking a palette entry adds a block, which is what marks the store dirty. */
function makeDirty() {
  fireEvent.click(screen.getByRole('button', { name: /Texto/ }))
}

describe('Builder', () => {
  it('renders a section tab for each section', () => {
    renderBuilder()
    const tabs = screen.getByRole('navigation', { name: 'Seções' })
    expect(within(tabs).getByRole('button', { name: 'Wi-Fi' })).toBeInTheDocument()
  })

  it('renders the active section in the preview', () => {
    renderBuilder()
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
  })

  it('switching section tab changes the previewed section', () => {
    renderBuilder()
    const tabs = screen.getByRole('navigation', { name: 'Seções' })
    fireEvent.click(within(tabs).getByRole('button', { name: 'Wi-Fi' }))
    expect(screen.queryByText('Bem-vindo')).not.toBeInTheDocument()
  })
})

describe('Builder session-expired banner', () => {
  it('warns that the session expired and the work is unsaved', () => {
    autosaveMock.status = 'expired'
    renderBuilder()
    expect(screen.getByRole('alert')).toHaveTextContent(SESSION_WARNING)
  })

  it('says the current changes have not been saved', () => {
    autosaveMock.status = 'expired'
    renderBuilder()
    expect(screen.getByRole('alert')).toHaveTextContent(/ainda não foram salvas/)
  })

  // A transient failure must not accuse the session of having expired.
  it('stays out of the way for a generic save error', () => {
    autosaveMock.status = 'error'
    renderBuilder()
    expect(screen.queryByText(SESSION_WARNING)).not.toBeInTheDocument()
  })

  it('is absent while saving normally', () => {
    autosaveMock.status = 'saved'
    renderBuilder()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('points the sign-in link at the login page', () => {
    autosaveMock.status = 'expired'
    renderBuilder()
    expect(screen.getByRole('link', { name: 'Entrar novamente' })).toHaveAttribute('href', '/login')
  })

  // Signing in has to happen elsewhere: leaving this tab discards the edits.
  it('opens the sign-in link in another tab', () => {
    autosaveMock.status = 'expired'
    renderBuilder()
    expect(screen.getByRole('link', { name: 'Entrar novamente' })).toHaveAttribute('target', '_blank')
  })

  it('runs the retry when the button is pressed', () => {
    autosaveMock.status = 'expired'
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }))
    expect(retryMock).toHaveBeenCalledTimes(1)
  })
})

describe('Builder unsaved-changes guard', () => {
  let handlers: Map<string, EventListener>
  let removed: string[]

  beforeEach(() => {
    handlers = new Map()
    removed = []
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      handlers.set(String(type), listener as EventListener)
    })
    vi.spyOn(window, 'removeEventListener').mockImplementation((type) => {
      removed.push(String(type))
    })
  })

  afterEach(() => vi.restoreAllMocks())

  /**
   * Stands in for the event the browser hands the handler. `returnValue` starts
   * as something other than '' so the assertion proves it was written, not that
   * it merely happened to match.
   */
  function fireBeforeUnload() {
    const event = { preventDefault: vi.fn(), returnValue: 'intocado' }
    handlers.get('beforeunload')!(event as unknown as Event)
    return event
  }

  it('does not warn while everything is saved', () => {
    renderBuilder()
    expect(handlers.has('beforeunload')).toBe(false)
  })

  it('starts watching once there are unsaved changes', () => {
    renderBuilder()
    makeDirty()
    expect(handlers.has('beforeunload')).toBe(true)
  })

  // Cancelling the event is what makes the browser show its own prompt.
  it('cancels the unload while the work is unsaved', () => {
    renderBuilder()
    makeDirty()
    expect(fireBeforeUnload().preventDefault).toHaveBeenCalled()
  })

  // Older engines ignore preventDefault and read this instead.
  it('sets returnValue while the work is unsaved', () => {
    renderBuilder()
    makeDirty()
    expect(fireBeforeUnload().returnValue).toBe('')
  })

  it('stops warning once the work is saved', () => {
    renderBuilder()
    makeDirty()
    act(() => autosaveMock.markSaved!())
    expect(removed).toContain('beforeunload')
  })

  it('stops warning when the builder unmounts', () => {
    const view = renderBuilder()
    makeDirty()
    view.unmount()
    expect(removed).toContain('beforeunload')
  })
})
