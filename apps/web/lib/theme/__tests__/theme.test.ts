import { describe, it, expect } from 'vitest'
import { resolveTheme } from '../theme'

type Vars = Record<string, string>

describe('resolveTheme', () => {
  it('defaults to the modern preset when no theme/enum', () => {
    const v = resolveTheme(undefined).vars as Vars
    expect(v['--g-accent']).toBe('#0d9488')
    expect(resolveTheme(undefined).headingFont).toBe('space')
  })

  it('uses the legacy enum when content theme is absent', () => {
    const v = resolveTheme(undefined, 'rustic').vars as Vars
    expect(v['--g-accent']).toBe('#5d4017')
  })

  it('applies a color override over the preset', () => {
    const v = resolveTheme({ preset: 'modern', colors: { accent: '#ff0000' } }).vars as Vars
    expect(v['--g-accent']).toBe('#ff0000')
    expect(v['--g-secondary']).toBe('#fbbf24')
  })

  it('derives accent-strong via color-mix from the resolved accent', () => {
    const v = resolveTheme({ preset: 'modern', colors: { accent: '#ff0000' } }).vars as Vars
    expect(v['--g-accent-strong']).toBe('color-mix(in srgb, #ff0000 70%, black)')
  })

  it('applies a font override and exposes the family var', () => {
    const r = resolveTheme({ preset: 'modern', headingFont: 'playfair' })
    expect(r.headingFont).toBe('playfair')
    expect((r.vars as Vars)['--g-font-heading']).toContain('Playfair Display')
  })

  it('falls back to the preset font when the override key is invalid', () => {
    const r = resolveTheme({ preset: 'modern', headingFont: 'not-a-font' })
    expect(r.headingFont).toBe('space')
  })

  it('rejects a body font passed as the heading override', () => {
    const r = resolveTheme({ preset: 'modern', headingFont: 'inter' })
    expect(r.headingFont).toBe('space')
  })
})
