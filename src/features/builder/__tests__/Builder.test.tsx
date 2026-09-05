import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
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

/**
 * The builder blocks navigation with `useBlocker`, which only exists on a data
 * router, so the harness mounts a real one. `/outra` stands in for anywhere the
 * host might go — the wordmark, the dashboard, anything.
 */
function renderBuilder() {
  const router = createMemoryRouter(
    [
      {
        path: '/app/p1/edit',
        element: (
          <>
            <Builder pageId="p1" title="Casa" whatsapp={null} theme="modern" initialContent={content} />
            <Link to="/outra">sair daqui</Link>
          </>
        ),
      },
      { path: '/outra', element: <p>outra página</p> },
    ],
    { initialEntries: ['/app/p1/edit'] },
  )
  const view = render(<RouterProvider router={router} />)
  return Object.assign(view, { router })
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

  it('runs the retry when the manual fallback is pressed', () => {
    autosaveMock.status = 'expired'
    renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }))
    expect(retryMock).toHaveBeenCalledTimes(1)
  })
})

describe('Builder session revalidation popup', () => {
  const ORIGIN = window.location.origin
  const popup = { name: 'popup' } as unknown as Window

  function expiredBuilder(opened: Window | null = popup) {
    const open = vi.spyOn(window, 'open').mockReturnValue(opened)
    autosaveMock.status = 'expired'
    renderBuilder()
    return open
  }

  function revalidate() {
    fireEvent.click(screen.getByRole('button', { name: 'Revalidar sessão' }))
  }

  /**
   * What the popup posts back. jsdom does not let a dispatched MessageEvent
   * carry an origin or a source, so both are pinned onto the event directly.
   */
  function postToOpener(
    overrides: { origin?: string; source?: Window; data?: unknown } = {},
  ) {
    const event = new MessageEvent('message', {
      data: overrides.data ?? { type: 'boasvindas:reauth-success' },
    })
    Object.defineProperty(event, 'origin', { value: overrides.origin ?? ORIGIN })
    Object.defineProperty(event, 'source', { value: overrides.source ?? popup })
    act(() => { window.dispatchEvent(event) })
  }

  afterEach(() => vi.restoreAllMocks())

  it('opens the login page in reauth mode', () => {
    const open = expiredBuilder()
    revalidate()
    expect(open.mock.calls[0][0]).toBe('/login?reauth=1')
  })

  // Navigating this tab would discard exactly the work being rescued.
  it('never navigates the builder tab', () => {
    expiredBuilder()
    const before = window.location.href
    revalidate()
    expect(window.location.href).toBe(before)
  })

  it('saves again once the popup reports success', () => {
    expiredBuilder()
    revalidate()
    postToOpener()
    expect(retryMock).toHaveBeenCalledTimes(1)
  })

  it('ignores a success claim from another origin', () => {
    expiredBuilder()
    revalidate()
    postToOpener({ origin: 'https://evil.example' })
    expect(retryMock).not.toHaveBeenCalled()
  })

  it('ignores a message of another type', () => {
    expiredBuilder()
    revalidate()
    postToOpener({ data: { type: 'outra-coisa' } })
    expect(retryMock).not.toHaveBeenCalled()
  })

  it('ignores a message from a window it did not open', () => {
    expiredBuilder()
    revalidate()
    postToOpener({ source: { name: 'outra' } as unknown as Window })
    expect(retryMock).not.toHaveBeenCalled()
  })

  // Closing the popup posts nothing, so nothing changes and the work is kept.
  it('stays expired when the popup is closed without signing in', () => {
    expiredBuilder()
    revalidate()
    expect(screen.getByRole('alert')).toHaveTextContent(SESSION_WARNING)
  })

  it('explains how to proceed when the popup is blocked', () => {
    expiredBuilder(null)
    revalidate()
    expect(screen.getByRole('alert')).toHaveTextContent(/Permita pop-ups e tente novamente/)
  })

  it('keeps the builder in place when the popup is blocked', () => {
    expiredBuilder(null)
    const before = window.location.href
    revalidate()
    expect(window.location.href).toBe(before)
  })

  it('says nothing about pop-ups until one is actually blocked', () => {
    expiredBuilder()
    revalidate()
    expect(screen.getByRole('alert')).not.toHaveTextContent(/Permita pop-ups/)
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

  it('keeps warning about reload even with the router guard in place', () => {
    renderBuilder()
    makeDirty()
    expect(handlers.has('beforeunload')).toBe(true)
  })

  it('stops warning when the builder unmounts', () => {
    const view = renderBuilder()
    makeDirty()
    view.unmount()
    expect(removed).toContain('beforeunload')
  })
})

describe('Builder navigation guard', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  })

  afterEach(() => vi.restoreAllMocks())

  function leaveByLink() {
    fireEvent.click(screen.getByRole('link', { name: 'sair daqui' }))
  }

  it('lets navigation through untouched when everything is saved', async () => {
    const { router } = renderBuilder()
    leaveByLink()
    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'))
  })

  it('does not ask anything when everything is saved', () => {
    renderBuilder()
    leaveByLink()
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('asks before leaving with unsaved work', () => {
    renderBuilder()
    makeDirty()
    leaveByLink()
    expect(confirmSpy).toHaveBeenCalledWith(
      'Você tem alterações que ainda não foram salvas. Sair agora vai descartá-las.',
    )
  })

  it('stays put when the host cancels', () => {
    const { router } = renderBuilder()
    makeDirty()
    leaveByLink()
    expect(router.state.location.pathname).toBe('/app/p1/edit')
  })

  // Cancelling has to leave the work exactly where it was, not just the URL.
  it('keeps the builder and its edits mounted when the host cancels', () => {
    renderBuilder()
    makeDirty()
    leaveByLink()
    expect(screen.getByRole('navigation', { name: 'Seções' })).toBeInTheDocument()
  })

  it('completes the navigation when the host confirms', async () => {
    const { router } = renderBuilder()
    makeDirty()
    confirmSpy.mockReturnValue(true)
    leaveByLink()
    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'))
  })

  it('asks before going back with unsaved work', async () => {
    const { router } = renderBuilder()
    makeDirty()
    await act(async () => { await router.navigate(-1) })
    expect(confirmSpy).toHaveBeenCalled()
  })

  it('stays on the builder when a back is cancelled', async () => {
    const { router } = renderBuilder()
    makeDirty()
    await act(async () => { await router.navigate(-1) })
    expect(router.state.location.pathname).toBe('/app/p1/edit')
  })

  it('goes back when the host confirms', async () => {
    const { router } = renderBuilder()
    confirmSpy.mockReturnValue(true)
    await act(async () => { await router.navigate('/outra') })
    await act(async () => { await router.navigate('/app/p1/edit') })
    makeDirty()
    await act(async () => { await router.navigate(-1) })
    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'))
  })

  it('asks before going forward with unsaved work', async () => {
    const { router } = renderBuilder()
    await act(async () => { await router.navigate('/outra') })
    await act(async () => { await router.navigate(-1) })
    makeDirty()
    await act(async () => { await router.navigate(1) })
    expect(confirmSpy).toHaveBeenCalled()
  })
})
