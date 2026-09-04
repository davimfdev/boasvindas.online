import { describe, it, expect, vi, afterEach } from 'vitest'
import { isReauthSuccess, notifyReauthSuccess, openReauthPopup, REAUTH_PATH, REAUTH_SUCCESS } from '../reauth'

const ORIGIN = window.location.origin

/** A stand-in for the popup handle, which is all `event.source` is compared against. */
const popup = { name: 'popup' } as unknown as Window
const other = { name: 'other' } as unknown as Window

function message(overrides: Partial<MessageEvent> = {}): MessageEvent {
  return {
    origin: ORIGIN,
    source: popup,
    data: { type: REAUTH_SUCCESS },
    ...overrides,
  } as MessageEvent
}

afterEach(() => vi.restoreAllMocks())

describe('openReauthPopup', () => {
  it('opens the login page in reauth mode', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(popup)
    openReauthPopup()
    expect(open.mock.calls[0][0]).toBe(REAUTH_PATH)
  })

  it('asks for a small resizable window', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(popup)
    openReauthPopup()
    expect(open.mock.calls[0][2]).toContain('width=420,height=620')
  })

  it('reports a blocked popup as null instead of throwing', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    expect(openReauthPopup()).toBeNull()
  })
})

describe('notifyReauthSuccess', () => {
  it('tells the opener the session is back', () => {
    const postMessage = vi.fn()
    vi.stubGlobal('opener', { postMessage })
    vi.spyOn(window, 'close').mockImplementation(() => {})
    notifyReauthSuccess()
    expect(postMessage.mock.calls[0][0]).toEqual({ type: REAUTH_SUCCESS })
    vi.unstubAllGlobals()
  })

  // A wildcard would hand the message to whatever page happens to be there.
  it('addresses the message to this exact origin, never a wildcard', () => {
    const postMessage = vi.fn()
    vi.stubGlobal('opener', { postMessage })
    vi.spyOn(window, 'close').mockImplementation(() => {})
    notifyReauthSuccess()
    expect(postMessage.mock.calls[0][1]).toBe(ORIGIN)
    vi.unstubAllGlobals()
  })

  it('carries nothing but the message type', () => {
    const postMessage = vi.fn()
    vi.stubGlobal('opener', { postMessage })
    vi.spyOn(window, 'close').mockImplementation(() => {})
    notifyReauthSuccess()
    expect(Object.keys(postMessage.mock.calls[0][0])).toEqual(['type'])
    vi.unstubAllGlobals()
  })

  it('closes itself once the opener has been told', () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    vi.stubGlobal('opener', { postMessage: vi.fn() })
    notifyReauthSuccess()
    expect(close).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('still closes when there is no opener to tell', () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    vi.stubGlobal('opener', null)
    notifyReauthSuccess()
    expect(close).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('isReauthSuccess', () => {
  it('accepts the message the popup posts', () => {
    expect(isReauthSuccess(message(), popup)).toBe(true)
  })

  it('rejects a message from another origin', () => {
    expect(isReauthSuccess(message({ origin: 'https://evil.example' }), popup)).toBe(false)
  })

  it('rejects a message from a different window', () => {
    expect(isReauthSuccess(message({ source: other }), popup)).toBe(false)
  })

  it('rejects an unrelated message type', () => {
    expect(isReauthSuccess(message({ data: { type: 'outra-coisa' } }), popup)).toBe(false)
  })

  it('rejects a message with no payload at all', () => {
    expect(isReauthSuccess(message({ data: null }), popup)).toBe(false)
  })

  it('rejects a bare string that merely spells the type', () => {
    expect(isReauthSuccess(message({ data: REAUTH_SUCCESS }), popup)).toBe(false)
  })

  // Without a handle there is no way to tell the popup apart from any other
  // same-origin window, so an otherwise perfect message is still refused.
  it('rejects an otherwise valid message when no popup is known', () => {
    expect(isReauthSuccess(message(), null)).toBe(false)
  })

  it('rejects a message from the real popup once the handle is gone', () => {
    expect(isReauthSuccess(message({ source: popup }), null)).toBe(false)
  })
})
