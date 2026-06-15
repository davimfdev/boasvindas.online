import { describe, it, expect } from 'vitest'
import { blockFlexStyle, spanFromFraction, MIN_W_PX, FILLABLE_BLOCKS } from '../layout'

describe('blockFlexStyle', () => {
  it('maps a span of 6 to a half-width flex-basis minus the gap', () => {
    expect(blockFlexStyle({ width: 6 }, 'button').flexBasis).toBe('calc(50% - 0.75rem)')
  })

  it('maps a full span (12) to 100%', () => {
    expect(blockFlexStyle({ width: 12 }, 'text').flexBasis).toBe('100%')
  })

  it('defaults a missing layout to full width', () => {
    expect(blockFlexStyle(undefined, 'text').flexBasis).toBe('100%')
  })

  it('uses the lg min-width for card blocks', () => {
    expect(blockFlexStyle({ width: 6 }, 'wifi').minWidth).toBe(MIN_W_PX.lg)
  })

  it('uses the sm min-width for small blocks', () => {
    expect(blockFlexStyle({ width: 6 }, 'button').minWidth).toBe(MIN_W_PX.sm)
  })

  it('includes height only when set', () => {
    expect(blockFlexStyle({ width: 6 }, 'button').height).toBeUndefined()
    expect(blockFlexStyle({ width: 6, height: 200 }, 'button').height).toBe(200)
  })
})

describe('spanFromFraction', () => {
  it('snaps half the container to span 6', () => {
    expect(spanFromFraction(500, 1000)).toBe(6)
  })
  it('clamps a tiny width to span 1', () => {
    expect(spanFromFraction(10, 1000)).toBe(1)
  })
  it('clamps an over-wide drag to span 12', () => {
    expect(spanFromFraction(2000, 1000)).toBe(12)
  })
  it('returns full span when the container has no width', () => {
    expect(spanFromFraction(100, 0)).toBe(12)
  })
})

describe('FILLABLE_BLOCKS', () => {
  it('includes the media blocks and excludes non-media', () => {
    expect(FILLABLE_BLOCKS.has('hero')).toBe(true)
    expect(FILLABLE_BLOCKS.has('image')).toBe(true)
    expect(FILLABLE_BLOCKS.has('carousel')).toBe(true)
    expect(FILLABLE_BLOCKS.has('map')).toBe(false)
    expect(FILLABLE_BLOCKS.has('text')).toBe(false)
  })
})
