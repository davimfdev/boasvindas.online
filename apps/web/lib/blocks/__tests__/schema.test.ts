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
