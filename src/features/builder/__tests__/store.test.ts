import { describe, it, expect, beforeEach } from 'vitest'
import { createBuilderStore } from '../store'
import type { PageContent } from '@/lib/blocks/schema'

const initial: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] },
  ],
}

let store: ReturnType<typeof createBuilderStore>
beforeEach(() => { store = createBuilderStore(initial) })

describe('builder store', () => {
  it('starts on the first section, nothing selected, not dirty', () => {
    const s = store.getState()
    expect(s.activeSectionId).toBe('s1')
    expect(s.selectedBlockId).toBeNull()
    expect(s.dirty).toBe(false)
  })
  it('addBlock appends to the active section and marks dirty', () => {
    store.getState().addBlock('text')
    const sec = store.getState().content.sections[0]
    expect(sec.blocks).toHaveLength(2)
    expect(sec.blocks[1].type).toBe('text')
    expect(store.getState().dirty).toBe(true)
  })
  it('updateBlockProps merges props of a block by id', () => {
    store.getState().updateBlockProps('b1', { text: 'Olá' })
    expect(store.getState().content.sections[0].blocks[0].props).toMatchObject({ text: 'Olá', level: 1 })
  })
  it('removeBlock deletes by id and clears selection if it was selected', () => {
    store.getState().selectBlock('b1')
    store.getState().removeBlock('b1')
    expect(store.getState().content.sections[0].blocks).toHaveLength(0)
    expect(store.getState().selectedBlockId).toBeNull()
  })
  it('moveBlock reorders within the active section', () => {
    store.getState().addBlock('text')
    const xId = store.getState().content.sections[0].blocks[1].id
    store.getState().moveBlock(xId, 0)
    expect(store.getState().content.sections[0].blocks[0].id).toBe(xId)
  })
  it('addSection adds and switches active to it', () => {
    store.getState().addSection()
    const s = store.getState()
    expect(s.content.sections).toHaveLength(2)
    expect(s.activeSectionId).toBe(s.content.sections[1].id)
  })
  it('removeSection refuses to delete the last remaining section', () => {
    store.getState().removeSection('s1')
    expect(store.getState().content.sections).toHaveLength(1)
  })
  it('setNav changes the nav style', () => {
    store.getState().setNav('onepage')
    expect(store.getState().content.nav).toBe('onepage')
  })
  it('undo reverts the last mutation; redo reapplies it', () => {
    store.getState().addBlock('text')
    expect(store.getState().content.sections[0].blocks).toHaveLength(2)
    store.getState().undo()
    expect(store.getState().content.sections[0].blocks).toHaveLength(1)
    store.getState().redo()
    expect(store.getState().content.sections[0].blocks).toHaveLength(2)
  })
  it('markSaved clears the dirty flag', () => {
    store.getState().addBlock('text')
    store.getState().markSaved()
    expect(store.getState().dirty).toBe(false)
  })

  it('setBlockLayout sets width and marks dirty', () => {
    store.getState().setBlockLayout('b1', { width: 6 })
    expect(store.getState().content.sections[0].blocks[0].layout).toEqual({ width: 6 })
    expect(store.getState().dirty).toBe(true)
  })

  it('setBlockLayout merges height onto an existing width', () => {
    store.getState().setBlockLayout('b1', { width: 6 })
    store.getState().setBlockLayout('b1', { height: 220 })
    expect(store.getState().content.sections[0].blocks[0].layout).toEqual({ width: 6, height: 220 })
  })

  it('setBlockLayout is undoable', () => {
    store.getState().setBlockLayout('b1', { width: 4 })
    store.getState().undo()
    expect(store.getState().content.sections[0].blocks[0].layout).toBeUndefined()
  })

  it('setBlockLayoutLive updates layout without pushing history', () => {
    const pastLen = store.getState().past.length
    store.getState().setBlockLayoutLive('b1', { width: 6 })
    expect(store.getState().content.sections[0].blocks[0].layout).toEqual({ width: 6 })
    expect(store.getState().past.length).toBe(pastLen)
    expect(store.getState().dirty).toBe(true)
  })

  it('pushHistory makes a live drag undoable in one step', () => {
    const before = store.getState().content
    store.getState().pushHistory(before)
    store.getState().setBlockLayoutLive('b1', { width: 6 })
    store.getState().setBlockLayoutLive('b1', { width: 3 })
    store.getState().undo()
    expect(store.getState().content.sections[0].blocks[0].layout).toBeUndefined()
  })

  it('setTheme sets a preset and marks dirty', () => {
    store.getState().setTheme({ preset: 'beach' })
    expect(store.getState().content.theme?.preset).toBe('beach')
    expect(store.getState().dirty).toBe(true)
  })

  it('setTheme deep-merges color overrides', () => {
    store.getState().setTheme({ colors: { accent: '#111111' } })
    store.getState().setTheme({ colors: { secondary: '#222222' } })
    expect(store.getState().content.theme?.colors).toEqual({ accent: '#111111', secondary: '#222222' })
  })

  it('setTheme with colors:undefined clears overrides (preset reset)', () => {
    store.getState().setTheme({ colors: { accent: '#111111' } })
    store.getState().setTheme({ preset: 'rustic', colors: undefined, headingFont: undefined, bodyFont: undefined })
    expect(store.getState().content.theme?.colors).toBeUndefined()
    expect(store.getState().content.theme?.preset).toBe('rustic')
  })

  it('setTheme is undoable', () => {
    store.getState().setTheme({ preset: 'beach' })
    store.getState().undo()
    expect(store.getState().content.theme).toBeUndefined()
  })
})
