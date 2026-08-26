import { describe, it, expect } from 'vitest'
import { pageContentSchema } from '../schema'
import { TEMPLATES, DEFAULT_TEMPLATE } from '../templates'

describe('templates', () => {
  it.each(Object.entries(TEMPLATES))('template %s is valid PageContent', (_name, tree) => {
    expect(pageContentSchema.safeParse(tree).success).toBe(true)
  })

  it('DEFAULT_TEMPLATE is one of the templates', () => {
    expect(Object.values(TEMPLATES)).toContain(DEFAULT_TEMPLATE)
  })

  it('apeCompleto has a wifi block somewhere', () => {
    const hasWifi = TEMPLATES.apeCompleto.sections.some((s) => s.blocks.some((b) => b.type === 'wifi'))
    expect(hasWifi).toBe(true)
  })
})
