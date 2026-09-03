/**
 * Uploaded images are stored in several widths; an image pasted as an external
 * URL is a single unknown file. Only our own URLs can offer a srcset, so the
 * helpers return undefined for anything else and the caller renders a plain img.
 */

/** Mirrors TARGET_WIDTHS in the API's image pipeline. */
const WIDTHS = [400, 800, 1600]

const MANAGED_URL = /^\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The API serves the widest variant it has when asked for more, so advertising
 * a width the upload did not reach costs a slightly larger download, never a
 * broken image.
 */
export function mediaSrcSet(url: string): string | undefined {
  if (!MANAGED_URL.test(url)) return undefined
  return WIDTHS.map((width) => `${url}?w=${width} ${width}w`).join(', ')
}

/** Guest pages are one column on a phone and capped around 800px on a desktop. */
export const MEDIA_SIZES = '(max-width: 768px) 100vw, 800px'
