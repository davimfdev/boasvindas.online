import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createBuilderStore } from '../store'
import { Inspector } from '../Inspector'
import type { PageContent } from '@/lib/blocks/schema'

const initial: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'wifi', props: { ssid: 'Net', password: 'p1' } } ] } ] }

it('shows an empty state when nothing is selected', () => {
  const store = createBuilderStore(initial)
  render(<Inspector store={store} />)
  expect(screen.getByText(/selecione um bloco/i)).toBeInTheDocument()
})

it('edits a wifi ssid through the store', () => {
  const store = createBuilderStore(initial)
  store.getState().selectBlock('b1')
  render(<Inspector store={store} />)
  const input = screen.getByLabelText('Rede (SSID)') as HTMLInputElement
  fireEvent.change(input, { target: { value: 'CasaNova' } })
  expect(store.getState().content.sections[0].blocks[0].props).toMatchObject({ ssid: 'CasaNova' })
})

it('picks a rules icon visually through the store', () => {
  const rules: PageContent = { nav: 'buttons', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'r1', type: 'rules', props: { items: [{ icon: 'Ban', label: 'Não fumar' }] } } ] } ] }
  const store = createBuilderStore(rules)
  store.getState().selectBlock('r1')
  render(<Inspector store={store} />)
  fireEvent.click(screen.getByRole('button', { name: /^Ícone:/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Dog' }))
  const items = store.getState().content.sections[0].blocks[0].props as { items: { icon: string }[] }
  expect(items.items[0].icon).toBe('Dog')
})
