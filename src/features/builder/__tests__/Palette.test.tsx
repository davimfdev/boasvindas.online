import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { createBuilderStore } from '../store'
import { Palette } from '../Palette'
import type { PageContent } from '@/lib/blocks/schema'

const initial: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [] } ] }

it('renders grouped block buttons', () => {
  render(<DndContext><Palette store={createBuilderStore(initial)} /></DndContext>)
  expect(screen.getByRole('button', { name: /Wi-Fi/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Texto/ })).toBeInTheDocument()
})

it('clicking a palette item adds that block to the active section', () => {
  const store = createBuilderStore(initial)
  render(<DndContext><Palette store={store} /></DndContext>)
  fireEvent.click(screen.getByRole('button', { name: /Wi-Fi/ }))
  const blocks = store.getState().content.sections[0].blocks
  expect(blocks).toHaveLength(1)
  expect(blocks[0].type).toBe('wifi')
})
