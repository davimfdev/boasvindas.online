import { describe, it, expect } from 'vitest'
import { PRESETS, DEFAULT_PRESET } from '../presets'
import { FONTS } from '../fonts'

const HEX = /^#[0-9a-fA-F]{6}$/

describe('PRESETS', () => {
  it('default preset exists', () => {
    expect(PRESETS[DEFAULT_PRESET]).toBeDefined()
  })

  it('every preset has valid hex colors and fonts of the right kind', () => {
    for (const key of Object.keys(PRESETS)) {
      const p = PRESETS[key]
      expect(p.colors.accent).toMatch(HEX)
      expect(p.colors.secondary).toMatch(HEX)
      expect(p.colors.background).toMatch(HEX)
      expect(FONTS[p.headingFont].kind).toBe('heading')
      expect(FONTS[p.bodyFont].kind).toBe('body')
    }
  })
})
