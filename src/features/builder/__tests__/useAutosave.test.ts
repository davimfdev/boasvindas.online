import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { PageContent } from '@/lib/blocks/schema'

// The API client is the boundary: the hook has to keep the ApiError it raises,
// because the status code is what separates an expired session from a blip.
const { putMock } = vi.hoisted(() => ({ putMock: vi.fn() }))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, api: { ...actual.api, put: putMock } }
})

const { ApiError } = await import('@/lib/api')
const { createAutosaver, useAutosave } = await import('../useAutosave')

const DELAY = 1200

const contentWith = (nav: PageContent['nav']): PageContent => ({ nav, sections: [] })
const unauthorized = () => new ApiError(401, { code: 'UNAUTHORIZED' })
const serverError = () => new ApiError(500, { code: 'INTERNAL' })

beforeEach(() => {
  vi.useFakeTimers()
  putMock.mockReset().mockResolvedValue(undefined)
})
afterEach(() => vi.useRealTimers())

/** Renders the hook and lets a test push new content through it. */
function setup(onSaved = vi.fn()) {
  const view = renderHook(
    ({ content, dirty }: { content: PageContent; dirty: boolean }) =>
      useAutosave('p1', content, dirty, onSaved),
    { initialProps: { content: contentWith('buttons'), dirty: false } },
  )
  return { ...view, onSaved }
}

/** Pushes an edit and lets the debounce elapse. */
async function edit(
  view: ReturnType<typeof setup>,
  nav: PageContent['nav'],
) {
  // Two acts on purpose: the scheduling effect has to flush before the timers
  // move, or the debounce would be advanced past a save that was never queued.
  act(() => { view.rerender({ content: contentWith(nav), dirty: true }) })
  await act(async () => { await vi.advanceTimersByTimeAsync(DELAY) })
}

describe('createAutosaver', () => {
  it('debounces: multiple rapid schedules result in one save', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const a = createAutosaver({ delayMs: 1000, save })
    a.schedule({ nav: 'buttons', sections: [] })
    a.schedule({ nav: 'buttons', sections: [] })
    a.schedule({ nav: 'onepage', sections: [] })
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledWith({ nav: 'onepage', sections: [] })
  })

  it('reports saving then saved on success', async () => {
    const statuses: string[] = []
    const a = createAutosaver({ delayMs: 500, save: () => Promise.resolve(), onStatus: (s) => statuses.push(s) })
    a.schedule({ nav: 'buttons', sections: [] })
    await vi.advanceTimersByTimeAsync(500)
    expect(statuses).toEqual(['saving', 'saved'])
  })

  it('reports error when save rejects', async () => {
    const statuses: string[] = []
    const a = createAutosaver({ delayMs: 500, save: () => Promise.reject(new Error('x')), onStatus: (s) => statuses.push(s) })
    a.schedule({ nav: 'buttons', sections: [] })
    await vi.advanceTimersByTimeAsync(500)
    expect(statuses).toEqual(['saving', 'error'])
  })
})

describe('useAutosave', () => {
  it('saves the edited content through the API client', async () => {
    const view = setup()
    await edit(view, 'onepage')
    expect(putMock).toHaveBeenCalledWith('/api/pages/p1', { content: contentWith('onepage') })
  })

  it('reports saved once the save goes through', async () => {
    const view = setup()
    await edit(view, 'onepage')
    expect(view.result.current.status).toBe('saved')
  })

  it('marks the page saved only on success', async () => {
    const view = setup()
    await edit(view, 'onepage')
    expect(view.onSaved).toHaveBeenCalled()
  })
})

describe('useAutosave when the session expired', () => {
  it('reports expired on a 401', async () => {
    putMock.mockRejectedValue(unauthorized())
    const view = setup()
    await edit(view, 'onepage')
    expect(view.result.current.status).toBe('expired')
  })

  it('never reports the work as saved', async () => {
    putMock.mockRejectedValue(unauthorized())
    const view = setup()
    await edit(view, 'onepage')
    expect(view.onSaved).not.toHaveBeenCalled()
  })

  // The whole point: editing on must not keep firing doomed requests.
  it('stops sending requests once expired, however much is typed', async () => {
    putMock.mockRejectedValue(unauthorized())
    const view = setup()
    await edit(view, 'onepage')
    await edit(view, 'buttons')
    await edit(view, 'onepage')
    expect(putMock).toHaveBeenCalledTimes(1)
  })

  it('does not fall back to saving when the user types again', async () => {
    putMock.mockRejectedValue(unauthorized())
    const view = setup()
    await edit(view, 'onepage')
    await edit(view, 'buttons')
    expect(view.result.current.status).toBe('expired')
  })
})

describe('useAutosave generic failures', () => {
  it('reports error rather than expired on a 500', async () => {
    putMock.mockRejectedValue(serverError())
    const view = setup()
    await edit(view, 'onepage')
    expect(view.result.current.status).toBe('error')
  })

  it('treats a plain network failure as error', async () => {
    putMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const view = setup()
    await edit(view, 'onepage')
    expect(view.result.current.status).toBe('error')
  })

  // These may well succeed on the next keystroke, so they must stay retryable.
  it('keeps trying on later edits', async () => {
    putMock.mockRejectedValue(serverError())
    const view = setup()
    await edit(view, 'onepage')
    await edit(view, 'buttons')
    expect(putMock).toHaveBeenCalledTimes(2)
  })
})

describe('useAutosave manual retry', () => {
  async function expire() {
    putMock.mockRejectedValue(unauthorized())
    const view = setup()
    await edit(view, 'onepage')
    return view
  }

  it('sends the content currently on screen', async () => {
    const view = await expire()
    act(() => { view.rerender({ content: contentWith('buttons'), dirty: true }) })
    putMock.mockResolvedValue(undefined)
    await act(async () => { await view.result.current.retry() })
    expect(putMock).toHaveBeenLastCalledWith('/api/pages/p1', { content: contentWith('buttons') })
  })

  it('reports saved when it goes through', async () => {
    const view = await expire()
    putMock.mockResolvedValue(undefined)
    await act(async () => { await view.result.current.retry() })
    expect(view.result.current.status).toBe('saved')
  })

  it('marks the page saved when it goes through', async () => {
    const view = await expire()
    putMock.mockResolvedValue(undefined)
    await act(async () => { await view.result.current.retry() })
    expect(view.onSaved).toHaveBeenCalled()
  })

  it('stays expired when the session is still gone', async () => {
    const view = await expire()
    await act(async () => { await view.result.current.retry() })
    expect(view.result.current.status).toBe('expired')
  })

  it('reports a plain failure without pretending it saved', async () => {
    const view = await expire()
    putMock.mockRejectedValue(serverError())
    await act(async () => { await view.result.current.retry() })
    expect(view.result.current.status).toBe('error')
  })

  it('lets autosave resume after a successful retry', async () => {
    const view = await expire()
    putMock.mockResolvedValue(undefined)
    await act(async () => { await view.result.current.retry() })
    await edit(view, 'onepage')
    expect(putMock).toHaveBeenCalledTimes(3)
  })
})
