/**
 * Which photograph the landing page hero shows on a given page load.
 *
 * Same provider and same transform parameters the hero already used: these are
 * direct Unsplash CDN URLs, and a photo id there is permanent, so the set needs
 * no API key and no request at runtime.
 */

const UNSPLASH = 'https://images.unsplash.com'
const TRANSFORM = 'auto=format&fit=crop&w=1920&q=80'

const PHOTO_IDS = [
  // The photograph the hero shipped with, kept so the set still looks familiar.
  'photo-1502672260266-1c1ef2d93688',
  'photo-1560448204-e02f11c3d0e2',
  'photo-1600585154340-be6161a56a0c',
  'photo-1586023492125-27b2c045efd7',
  'photo-1512917774080-9991f1c4c750',
] as const

/**
 * Deliberately excludes the two photographs used further down the same page,
 * by the bento card and the showcase: drawing one of those would read as a
 * duplicate rather than as variety.
 */
export const HERO_IMAGES: readonly string[] = PHOTO_IDS.map(
  (id) => `${UNSPLASH}/${id}?${TRANSFORM}`,
)

const STORAGE_KEY = 'boasvindas:hero-image'

/**
 * Picks one photograph, skipping the one the previous load showed so a reload
 * visibly changes something. With a single candidate there is nothing to skip
 * and it is returned as is.
 */
export function chooseHeroImage(
  images: readonly string[],
  previous: string | null,
  random: () => number = Math.random,
): string {
  const candidates = images.length > 1 ? images.filter((image) => image !== previous) : images
  return candidates[Math.floor(random() * candidates.length)] ?? images[0]
}

/** The choice for this page load, based on what the last one left behind. */
export function pickHeroImage(): string {
  return chooseHeroImage(HERO_IMAGES, readPrevious())
}

/**
 * Records what was actually shown. Kept separate from picking so the value
 * stored is the one on screen, even when React renders twice in development.
 */
export function rememberHeroImage(image: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, image)
  } catch {
    // Private windows and blocked storage: a repeat is not worth an error.
  }
}

function readPrevious(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
