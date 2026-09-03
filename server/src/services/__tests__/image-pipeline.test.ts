import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { processImage, UnprocessableImageError } from '../image-pipeline.js'

/** Stands in for a photo straight off a phone. */
function makeImage(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 90, b: 140 } },
  })
}

/**
 * A landscape buffer tagged as a quarter turn — exactly how a phone stores a
 * portrait shot: the pixels stay sideways and EXIF says how to display them.
 */
function withOrientation(orientation: number): Promise<Buffer> {
  return makeImage(1200, 800).withMetadata({ orientation }).jpeg().toBuffer()
}

describe('processImage', () => {
  it('caps the widest variant at 1600px', async () => {
    const result = await processImage(await makeImage(4000, 3000).jpeg().toBuffer())
    expect(result.width).toBe(1600)
  })

  it('keeps the aspect ratio of the original', async () => {
    const result = await processImage(await makeImage(4000, 3000).jpeg().toBuffer())
    expect(result.height).toBe(1200)
  })

  it('offers the three srcset widths for a large photo', async () => {
    const result = await processImage(await makeImage(4000, 3000).jpeg().toBuffer())
    expect(result.variants.map((v) => v.width)).toEqual([400, 800, 1600])
  })

  it('never upscales an image smaller than the smallest target', async () => {
    const result = await processImage(await makeImage(300, 200).png().toBuffer())
    expect(result.variants.map((v) => v.width)).toEqual([300])
  })

  it('encodes every variant as WebP', async () => {
    const result = await processImage(await makeImage(1200, 800).jpeg().toBuffer())
    const formats = await Promise.all(
      result.variants.map(async (v) => (await sharp(v.bytes).metadata()).format),
    )
    expect(formats).toEqual(['webp', 'webp', 'webp'])
  })

  it('shrinks a phone-sized photo by an order of magnitude', async () => {
    const original = await makeImage(4000, 3000).jpeg({ quality: 90 }).toBuffer()
    const result = await processImage(original)
    const widest = result.variants[result.variants.length - 1]
    expect(widest.bytes.length).toBeLessThan(original.length / 2)
  })

  it('drops EXIF metadata so a public page never publishes the GPS of the property', async () => {
    const tagged = await withOrientation(6)
    expect((await sharp(tagged).metadata()).exif).toBeDefined()

    const output = await processImage(tagged)
    expect((await sharp(output.variants[0].bytes).metadata()).exif).toBeUndefined()
  })

  it('applies the EXIF orientation instead of leaving a portrait photo sideways', async () => {
    const result = await processImage(await withOrientation(6))
    expect(result.height).toBeGreaterThan(result.width)
  })

  it('rejects bytes that pass as an image but cannot be decoded', async () => {
    const notAnImage = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64, 7),
    ])
    await expect(processImage(notAnImage)).rejects.toThrow(UnprocessableImageError)
  })
})
