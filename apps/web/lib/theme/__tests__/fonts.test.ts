import { describe, it, expect } from 'vitest'
import { FONTS, FONT_KEYS } from '../fonts'

describe('FONTS', () => {
  it('every font has a family, a hosted stylesheet href and a valid kind', () => {
    for (const key of FONT_KEYS) {
      const f = FONTS[key]
      expect(f.family.length).toBeGreaterThan(0)
      expect(f.cssHref).toMatch(/^https:\/\/(fonts\.googleapis\.com|api\.fontshare\.com)\//)
      expect(['heading', 'body']).toContain(f.kind)
    }
  })

  it('has at least one heading and one body font', () => {
    expect(FONT_KEYS.some((k) => FONTS[k].kind === 'heading')).toBe(true)
    expect(FONT_KEYS.some((k) => FONTS[k].kind === 'body')).toBe(true)
  })
})
