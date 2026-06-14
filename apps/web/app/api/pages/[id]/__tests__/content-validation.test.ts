import { describe, it, expect } from 'vitest'
import { updateSchema } from '../update-schema'

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
