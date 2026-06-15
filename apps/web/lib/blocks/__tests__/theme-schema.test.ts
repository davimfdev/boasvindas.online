import { describe, it, expect } from 'vitest'
import { pageContentSchema } from '../schema'

const page = (theme?: unknown) => ({
  nav: 'buttons',
  sections: [{ id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] }],
  ...(theme === undefined ? {} : { theme }),
})

describe('page theme schema', () => {
  it('parses content with no theme', () => {
    const r = pageContentSchema.safeParse(page())
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.theme).toBeUndefined()
  })

  it('parses a valid theme with a partial color override', () => {
    const r = pageContentSchema.safeParse(page({ preset: 'modern', colors: { accent: '#ff8800' }, headingFont: 'playfair' }))
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.theme?.colors?.accent).toBe('#ff8800')
  })

  it('rejects an invalid hex color', () => {
    expect(pageContentSchema.safeParse(page({ preset: 'modern', colors: { accent: '#zzz' } })).success).toBe(false)
  })
})
