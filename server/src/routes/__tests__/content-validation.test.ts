import { describe, it, expect } from 'vitest'
import { updateSchema } from '../update-schema.js'

describe('pages PUT updateSchema', () => {
  it('accepts a valid content tree', () => {
    const r = updateSchema.safeParse({ content: { nav: 'buttons', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [] },
    ] } })
    expect(r.success).toBe(true)
  })

  it('rejects a content tree with a bad nav', () => {
    const r = updateSchema.safeParse({ content: { nav: 'spiral', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [] },
    ] } })
    expect(r.success).toBe(false)
  })

  it('still accepts a title-only update (content optional)', () => {
    const r = updateSchema.safeParse({ title: 'Casa da Praia' })
    expect(r.success).toBe(true)
  })
})

// The builder saves the URL the upload handed back, which is relative to our own
// origin. Rejecting it here is what silently discarded every uploaded image.
describe('pages PUT with uploaded images', () => {
  const MANAGED = '/api/media/33333333-3333-4333-8333-333333333333'

  const withBlocks = (blocks: unknown[]) =>
    updateSchema.safeParse({ content: { nav: 'buttons', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks },
    ] } })

  it('accepts an image block pointing at an uploaded image', () => {
    expect(withBlocks([{ id: 'b1', type: 'image', props: { url: MANAGED, alt: '' } }]).success).toBe(true)
  })

  it('accepts a hero block pointing at an uploaded image', () => {
    expect(withBlocks([
      { id: 'b1', type: 'hero', props: { imageUrl: MANAGED, greeting: 'Oi', propertyName: 'Apê' } },
    ]).success).toBe(true)
  })

  it('accepts a carousel pointing at an uploaded image', () => {
    expect(withBlocks([
      { id: 'b1', type: 'carousel', props: { images: [{ url: MANAGED, alt: '' }] } },
    ]).success).toBe(true)
  })

  it('keeps accepting an external URL the host pasted', () => {
    expect(withBlocks([
      { id: 'b1', type: 'image', props: { url: 'https://i.imgur.com/abc123.jpg', alt: '' } },
    ]).success).toBe(true)
  })

  it('keeps rejecting an arbitrary relative path', () => {
    expect(withBlocks([{ id: 'b1', type: 'image', props: { url: '/foo/bar', alt: '' } }]).success).toBe(false)
  })

  it('keeps rejecting a media path whose id is not a uuid', () => {
    expect(withBlocks([
      { id: 'b1', type: 'image', props: { url: '/api/media/valor-invalido', alt: '' } },
    ]).success).toBe(false)
  })
})
