import { describe, it, expect } from 'vitest'
import { blockSchema, pageContentSchema } from '../schema'

describe('blockSchema', () => {
  it('accepts a valid wifi block', () => {
    const result = blockSchema.safeParse({
      id: 'b1', type: 'wifi', props: { ssid: 'Net', password: 'pass1234' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects a wifi block missing its password', () => {
    const result = blockSchema.safeParse({
      id: 'b1', type: 'wifi', props: { ssid: 'Net' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown block type', () => {
    const result = blockSchema.safeParse({ id: 'b1', type: 'bogus', props: {} })
    expect(result.success).toBe(false)
  })
})

describe('pageContentSchema', () => {
  it('accepts a page with one section containing one block', () => {
    const result = pageContentSchema.safeParse({
      nav: 'buttons',
      sections: [{ id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } },
      ] }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid nav style', () => {
    const result = pageContentSchema.safeParse({ nav: 'carousel', sections: [{ id: 's1', title: 'x', icon: 'Home', blocks: [] }] })
    expect(result.success).toBe(false)
  })
})

// An upload is served from our own origin, so its URL is relative. Accepting it
// without accepting relative paths in general is the whole point of these tests.
describe('image URLs', () => {
  const MANAGED = '/api/media/33333333-3333-4333-8333-333333333333'
  const EXTERNAL = 'https://i.imgur.com/abc123.jpg'

  const image = (url: unknown) =>
    blockSchema.safeParse({ id: 'b1', type: 'image', props: { url, alt: '' } })
  const hero = (imageUrl: unknown) =>
    blockSchema.safeParse({ id: 'b1', type: 'hero', props: { imageUrl, greeting: 'Oi', propertyName: 'Apê' } })
  const carousel = (url: unknown) =>
    blockSchema.safeParse({ id: 'b1', type: 'carousel', props: { images: [{ url, alt: '' }] } })

  it('accepts an uploaded image URL on an image block', () => {
    expect(image(MANAGED).success).toBe(true)
  })

  it('accepts an uploaded image URL on a hero block', () => {
    expect(hero(MANAGED).success).toBe(true)
  })

  it('accepts an uploaded image URL on a carousel image', () => {
    expect(carousel(MANAGED).success).toBe(true)
  })

  it('keeps accepting an external URL pasted by the host', () => {
    expect(image(EXTERNAL).success).toBe(true)
  })

  it('keeps accepting an external URL on hero and carousel', () => {
    expect([hero(EXTERNAL).success, carousel(EXTERNAL).success]).toEqual([true, true])
  })

  it('rejects an arbitrary relative path', () => {
    expect(image('/foo/bar').success).toBe(false)
  })

  it('rejects a relative path under another api route', () => {
    expect(image('/api/outro/33333333-3333-4333-8333-333333333333').success).toBe(false)
  })

  it('rejects a media path whose id is not a uuid', () => {
    expect(image('/api/media/valor-invalido').success).toBe(false)
  })

  it('rejects a media path that tries to climb out of the route', () => {
    expect(image('/api/media/../../etc/passwd').success).toBe(false)
  })

  it('rejects a media path carrying a query string', () => {
    expect(image(`${MANAGED}?w=400`).success).toBe(false)
  })

  it('rejects a media path whose route is cased differently, since Express would 404 it', () => {
    expect(image('/API/MEDIA/33333333-3333-4333-8333-333333333333').success).toBe(false)
  })

  it('rejects a protocol-relative URL dressed up as a media path', () => {
    expect(image('//evil.example.com/api/media/33333333-3333-4333-8333-333333333333').success).toBe(false)
  })

  it('rejects an image block with no url at all', () => {
    expect(blockSchema.safeParse({ id: 'b1', type: 'image', props: { alt: '' } }).success).toBe(false)
  })

  it('rejects an empty url on an image block, which is required', () => {
    expect(image('').success).toBe(false)
  })

  it('treats a cleared hero image as unset rather than invalid', () => {
    const r = hero('')
    expect(r.success && r.data.type === 'hero' && r.data.props.imageUrl).toBe(undefined)
  })

  it('treats a cleared carousel image URL as unset rather than invalid', () => {
    expect(carousel('').success).toBe(true)
  })

  it('still rejects a managed media URL where a map link is expected', () => {
    const r = blockSchema.safeParse({
      id: 'b1', type: 'guide',
      props: { places: [{ name: 'Bar', blurb: '', mapUrl: MANAGED, tags: [] }] },
    })
    expect(r.success).toBe(false)
  })
})

describe('buttonBlock href safety', () => {
  it('accepts a button block with a normal href', () => {
    const r = blockSchema.safeParse({ id: 'b1', type: 'button', props: { label: 'Maps', href: 'https://maps.example.com', kind: 'map' } })
    expect(r.success).toBe(true)
  })

  it('rejects a button block with a javascript: href', () => {
    const r = blockSchema.safeParse({ id: 'b1', type: 'button', props: { label: 'x', href: 'javascript:alert(1)' } })
    expect(r.success).toBe(false)
  })

  it('rejects a button block with a whitespace-padded javascript: href', () => {
    const r = blockSchema.safeParse({ id: 'b1', type: 'button', props: { label: 'x', href: '  JavaScript:alert(1)' } })
    expect(r.success).toBe(false)
  })
})
