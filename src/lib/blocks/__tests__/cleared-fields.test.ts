import { describe, it, expect } from 'vitest'
import { blockSchema } from '../schema'

// When a host clears an optional field in the inspector it sends '' (not undefined).
// These must save instead of failing validation silently.
describe('cleared optional fields', () => {
  it('accepts an emptied button href', () => {
    const r = blockSchema.safeParse({ id: 'b1', type: 'button', props: { label: 'X', href: '', kind: 'link' } })
    expect(r.success).toBe(true)
  })

  it('treats an emptied hero imageUrl as unset', () => {
    const r = blockSchema.safeParse({ id: 'b1', type: 'hero', props: { greeting: 'Oi', propertyName: 'Casa', imageUrl: '' } })
    expect(r.success).toBe(true)
    if (r.success && r.data.type === 'hero') expect(r.data.props.imageUrl).toBeUndefined()
  })

  it('treats an emptied guide place mapUrl as unset', () => {
    const r = blockSchema.safeParse({ id: 'b1', type: 'guide', props: { places: [{ name: 'Lugar', blurb: '', mapUrl: '' }] } })
    expect(r.success).toBe(true)
    if (r.success && r.data.type === 'guide') expect(r.data.props.places[0].mapUrl).toBeUndefined()
  })

  it('still rejects a javascript: href', () => {
    const r = blockSchema.safeParse({ id: 'b1', type: 'button', props: { label: 'X', href: 'javascript:alert(1)', kind: 'link' } })
    expect(r.success).toBe(false)
  })
})
