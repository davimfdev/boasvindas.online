import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../api'

// fetch is the system boundary here; nothing else in the module is stubbed.
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('declares JSON for a body it serialised itself', async () => {
    await api.post('/api/pages', { title: 'Minha Suíte' })
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
  })

  it('leaves the Content-Type to the browser for a multipart body', async () => {
    await api.upload('/api/media/upload', new FormData())
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
  })

  it('sends the form as the request body', async () => {
    const form = new FormData()
    form.append('pageId', 'page-1')
    await api.upload('/api/media/upload', form)
    expect(fetchMock.mock.calls[0][1].body).toBe(form)
  })
})
