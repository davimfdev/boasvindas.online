import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createBuilderStore } from '../store'
import { Preview } from '../Preview'
import type { PageContent } from '@/lib/blocks/schema'

const initial: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } } ] } ] }

it('renders the active section blocks via BlockRenderer', () => {
  render(<Preview store={createBuilderStore(initial)} theme="modern" whatsapp={null} />)
  expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
})

it('clicking a block selects it in the store', () => {
  const store = createBuilderStore(initial)
  render(<Preview store={store} theme="modern" whatsapp={null} />)
  fireEvent.click(screen.getByText('Bem-vindo'))
  expect(store.getState().selectedBlockId).toBe('b1')
})

it('applies the span width as a flex-basis on the block wrapper', () => {
  const widthContent: PageContent = { nav: 'buttons', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 }, layout: { width: 6 } } ] } ] }
  const { container } = render(<Preview store={createBuilderStore(widthContent)} theme="modern" whatsapp={null} />)
  const wrapper = container.querySelector('[role="group"]') as HTMLElement
  expect(wrapper.style.flexBasis).toBe('calc(50% - 0.75rem)')
})

it('applies themed css vars on the preview frame', () => {
  const themed: PageContent = { nav: 'buttons', theme: { preset: 'rustic' }, sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
  const { container } = render(<Preview store={createBuilderStore(themed)} theme="modern" whatsapp={null} />)
  const frame = container.querySelector('.guest-site') as HTMLElement
  expect(frame.style.getPropertyValue('--g-accent')).toBe('#5d4017')
})
