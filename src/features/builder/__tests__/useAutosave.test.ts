import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAutosaver } from '../useAutosave'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createAutosaver', () => {
  it('debounces: multiple rapid schedules result in one save', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const a = createAutosaver({ delayMs: 1000, save })
    a.schedule({ nav: 'buttons', sections: [] })
    a.schedule({ nav: 'buttons', sections: [] })
    a.schedule({ nav: 'onepage', sections: [] })
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledTimes(1)
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
