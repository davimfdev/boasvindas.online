import { describe, it, expect } from 'vitest'
import { searchContent } from '../search'
import type { PageContent } from '../schema'

const content: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Café da manhã', level: 2 } },
    { id: 'b2', type: 'wifi', props: { ssid: 'CasaRede', password: 'x' } } ] },
  { id: 's2', title: 'Guia', icon: 'Map', blocks: [
    { id: 'b3', type: 'guide', props: { places: [{ name: 'Bistrô do Sol', blurb: '', tags: [] }] } } ] },
] }

describe('searchContent', () => {
  it('returns [] for an empty query', () => {
    expect(searchContent(content, '   ')).toEqual([])
  })
  it('finds a heading and reports its section', () => {
    const r = searchContent(content, 'café')
    expect(r[0].sectionId).toBe('s1')
    expect(r[0].snippet).toBe('Café da manhã')
  })
  it('is accent-insensitive', () => {
    expect(searchContent(content, 'cafe').length).toBeGreaterThan(0)
  })
  it('finds a wifi by ssid', () => {
    expect(searchContent(content, 'casarede')[0].sectionId).toBe('s1')
  })
  it('finds a guide place by name in its section', () => {
    expect(searchContent(content, 'bistrô')[0].sectionId).toBe('s2')
  })
})
