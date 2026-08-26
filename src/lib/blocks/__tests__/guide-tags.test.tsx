import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { createBuilderStore } from '@/features/builder/store'
import { Inspector } from '@/features/builder/Inspector'
import type { PageContent } from '@/lib/blocks/schema'

describe('guide tags', () => {
  it('parses a guide place with tags', () => {
    const r = blockSchema.safeParse({ id: 'g1', type: 'guide', props: { places: [
      { name: 'Bistrô', blurb: '', tags: ['praia', 'comida'] } ] } })
    expect(r.success).toBe(true)
  })

  it('edits tags as comma-separated text through the inspector', () => {
    const content: PageContent = { nav: 'buttons', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'g1', type: 'guide', props: { places: [{ name: 'Bistrô', blurb: '', tags: [] }] } } ] } ] }
    const store = createBuilderStore(content)
    store.getState().selectBlock('g1')
    render(<Inspector store={store} />)
    fireEvent.change(screen.getByLabelText('Tags (vírgula)'), { target: { value: 'praia, comida ,' } })
    const place = (store.getState().content.sections[0].blocks[0].props as { places: { tags: string[] }[] }).places[0]
    expect(place.tags).toEqual(['praia', 'comida'])
  })
})
