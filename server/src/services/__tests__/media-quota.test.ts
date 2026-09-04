import { describe, expect, it } from 'vitest'

process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test'
process.env.AUTH_SECRET = 'a'.repeat(40)

const { storedBytesOf, totalStoredBytes } = await import('../media-quota.js')

const variant = (width: number, sizeBytes: number) => ({ width, file: `${width}.webp`, sizeBytes })

describe('storedBytesOf', () => {
  // sizeBytes records the widest variant alone, so a row that trusted it would
  // under-report by every narrower width the pipeline also wrote to disk.
  it('sums every variant rather than trusting sizeBytes', () => {
    const row = { sizeBytes: 900, variants: [variant(400, 100), variant(800, 300), variant(1600, 900)] }
    expect(storedBytesOf(row)).toBe(1300)
  })

  it('falls back to sizeBytes for a legacy row with no variants', () => {
    expect(storedBytesOf({ sizeBytes: 512, variants: null })).toBe(512)
  })

  it('falls back to sizeBytes when the variants array is empty', () => {
    expect(storedBytesOf({ sizeBytes: 512, variants: [] })).toBe(512)
  })

  it('counts a single-variant row once', () => {
    expect(storedBytesOf({ sizeBytes: 700, variants: [variant(500, 700)] })).toBe(700)
  })
})

describe('totalStoredBytes', () => {
  it('is zero for an account with no media', () => {
    expect(totalStoredBytes([])).toBe(0)
  })

  it('adds up rows of both shapes', () => {
    const rows = [
      { sizeBytes: 900, variants: [variant(400, 100), variant(1600, 900)] },
      { sizeBytes: 512, variants: null },
    ]
    expect(totalStoredBytes(rows)).toBe(1512)
  })
})
