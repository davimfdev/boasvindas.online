import { describe, it, expect } from 'vitest'
import { blockGridStyle, gridRowSpan, spanFromFraction, FILLABLE_BLOCKS, GRID_ROW_UNIT, GRID_ROW_GAP } from '../layout'

describe('blockGridStyle', () => {
  it('maps a span of 6 to a 6-column grid span', () => {
    expect(blockGridStyle({ width: 6 }).gridColumn).toBe('span 6')
  })

  it('defaults a missing layout to a full 12-column span', () => {
    expect(blockGridStyle(undefined).gridColumn).toBe('span 12')
  })

  it('clamps an out-of-range width into 1..12', () => {
    expect(blockGridStyle({ width: 0 }).gridColumn).toBe('span 1')
    expect(blockGridStyle({ width: 99 }).gridColumn).toBe('span 12')
  })
})

describe('gridRowSpan', () => {
  it('covers the content height plus the gap, rounded up to whole rows', () => {
    // ceil((100 + 24) / 8) = ceil(15.5) = 16
    expect(gridRowSpan(100)).toBe(16)
  })

  it('never returns fewer than 1 row', () => {
    expect(gridRowSpan(0)).toBe(Math.ceil(GRID_ROW_GAP / GRID_ROW_UNIT))
    expect(gridRowSpan(-50)).toBe(1)
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
    expect(FILLABLE_BLOCKS.has('text')).toBe(false)
  })
})
