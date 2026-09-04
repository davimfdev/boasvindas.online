/**
 * Signing back in without unloading the builder.
 *
 * The unsaved page only exists in the builder tab's memory, so the login form
 * runs in a popup and reports back through `postMessage`. Nothing about the
 * session travels in that message: authentication stays entirely in the
 * httpOnly cookie the popup receives, which the opener shares by origin. The
 * message is a "try again now" signal and nothing more.
 */

export const REAUTH_PARAM = 'reauth'
export const REAUTH_PATH = `/login?${REAUTH_PARAM}=1`
export const REAUTH_SUCCESS = 'boasvindas:reauth-success'

const WINDOW_NAME = 'boasvindas-reauth'
const WINDOW_FEATURES = 'width=420,height=620,resizable=yes,scrollbars=yes'

/** Returns null when the browser refused to open it, which callers must handle. */
export function openReauthPopup(): Window | null {
  return window.open(REAUTH_PATH, WINDOW_NAME, WINDOW_FEATURES)
}

/** Called by the popup once the cookie is set. Never carries a credential. */
export function notifyReauthSuccess(): void {
  window.opener?.postMessage({ type: REAUTH_SUCCESS }, window.location.origin)
  window.close()
}

/**
 * Anything on the page can post a message, so a claim of success is only
 * believed when it comes from this origin, from the window we opened, and
 * carries the exact type. The origin is never a wildcard.
 *
 * Without a known handle the message is ignored rather than trusted on origin
 * alone: the builder opens the popup itself, so it always has the handle for a
 * window it actually asked for. Losing it is not a reason to widen who may
 * speak — reopening the popup costs one click.
 */
export function isReauthSuccess(event: MessageEvent, popup: Window | null): boolean {
  if (!popup) return false
  if (event.origin !== window.location.origin) return false
  if (event.source !== popup) return false
  const data: unknown = event.data
  return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === REAUTH_SUCCESS
}
