import { describe, it, expect } from 'vitest'
import { resolvePageContent } from '../page-content.js'
import { DEFAULT_TEMPLATE } from '../../lib/blocks/templates.js'

describe('resolvePageContent', () => {
  it('returns stored content when present', () => {
    const stored = { nav: 'onepage' as const, sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [] },
    ] }
    expect(resolvePageContent(stored)).toEqual(stored)
  })

  it('falls back to the default template when content is null', () => {
    expect(resolvePageContent(null)).toEqual(DEFAULT_TEMPLATE)
  })

  it('falls back when stored content fails validation', () => {
    expect(resolvePageContent({ nav: 'bogus' })).toEqual(DEFAULT_TEMPLATE)
  })
})
