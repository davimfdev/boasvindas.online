import { describe, it, expect } from 'vitest'
import { blockSchema } from '../schema'

const heading = (extra: object = {}) => ({ id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 }, ...extra })

describe('block layout schema', () => {
  it('parses a block with no layout (layout is optional)', () => {
    const r = blockSchema.safeParse(heading())
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.layout).toBeUndefined()
  })

  it('accepts a valid layout span of 6 with a height', () => {
    const r = blockSchema.safeParse(heading({ layout: { width: 6, height: 200 } }))
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.layout).toEqual({ width: 6, height: 200 })
  })

  it('rejects a span greater than 12', () => {
    expect(blockSchema.safeParse(heading({ layout: { width: 13 } })).success).toBe(false)
  })

  it('rejects a span below 1', () => {
    expect(blockSchema.safeParse(heading({ layout: { width: 0 } })).success).toBe(false)
  })
})
