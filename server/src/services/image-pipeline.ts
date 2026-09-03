/**
 * Turns an uploaded photo into the sizes a guest page actually renders.
 *
 * Hosts upload straight from a phone: 4000x3000 and 4-6 MB is the norm, for an
 * image that will be painted a few hundred pixels wide on the guest's screen,
 * often over mobile data. Serving the original wastes far more bandwidth than
 * the whole JavaScript bundle costs.
 */

import sharp from 'sharp'

/** Widths offered to the browser through srcset. */
const TARGET_WIDTHS = [400, 800, 1600] as const

/** Beyond this, extra pixels buy nothing on the layouts the guest page uses. */
const MAX_WIDTH = 1600

const WEBP_QUALITY = 80

export class UnprocessableImageError extends Error {
  constructor() {
    super('image could not be decoded')
    this.name = 'UnprocessableImageError'
  }
}

export interface ImageVariant {
  width: number
  bytes: Buffer
}

export interface ProcessedImage {
  /** Smallest first; the last entry is the one served by default. */
  variants: ImageVariant[]
  width: number
  height: number
}

/**
 * Every output is WebP with metadata dropped. Dropping metadata is not only a
 * size win: a phone photo carries GPS coordinates in EXIF, and a guest page is
 * public, so the original bytes would publish where the property is.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  // rotate() with no argument applies the EXIF orientation and then discards it,
  // which is what keeps portrait photos from arriving sideways.
  const source = sharp(input, { failOn: 'error' }).rotate()

  let width: number
  let height: number
  try {
    const meta = await source.metadata()
    if (!meta.width || !meta.height) throw new UnprocessableImageError()
    // metadata() describes the file, not the rotated result. Orientations 5-8
    // are the quarter turns, so a portrait phone photo reports itself as
    // landscape — swapping here is what keeps its variants from being sized
    // against the wrong axis.
    const isQuarterTurned = (meta.orientation ?? 1) >= 5 && (meta.orientation ?? 1) <= 8
    width = isQuarterTurned ? meta.height : meta.width
    height = isQuarterTurned ? meta.width : meta.height
  } catch {
    throw new UnprocessableImageError()
  }

  const largest = Math.min(width, MAX_WIDTH)
  const widths = [...new Set([...TARGET_WIDTHS.filter((w) => w < largest), largest])].sort((a, b) => a - b)

  const variants: ImageVariant[] = []
  for (const target of widths) {
    // withoutEnlargement guards the case of an original narrower than a target.
    const bytes = await source
      .clone()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
    variants.push({ width: target, bytes })
  }

  const scale = largest / width
  return { variants, width: largest, height: Math.round(height * scale) }
}
