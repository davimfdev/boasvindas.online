import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createBuilderStore } from '../store'
import { ThemePanel } from '../ThemePanel'
import type { PageContent } from '@/lib/blocks/schema'

const content: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [] } ] }

it('applies a preset when its swatch is clicked', () => {
  const store = createBuilderStore(content)
  render(<ThemePanel store={store} />)
  fireEvent.click(screen.getByRole('button', { name: /Praia/ }))
  expect(store.getState().content.theme?.preset).toBe('beach')
})

it('writes a color override when a color input changes', () => {
  const store = createBuilderStore(content)
  render(<ThemePanel store={store} />)
  const accent = screen.getByLabelText('Destaque') as HTMLInputElement
  fireEvent.change(accent, { target: { value: '#123456' } })
  expect(store.getState().content.theme?.colors?.accent).toBe('#123456')
})
