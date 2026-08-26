import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Builder } from '../Builder'
import type { PageContent } from '@/lib/blocks/schema'

const content: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } } ] },
    { id: 's2', title: 'Wi-Fi', icon: 'Wifi', blocks: [] },
  ],
}

function renderBuilder() {
  return render(
    <Builder pageId="p1" title="Casa" whatsapp={null} theme="modern" initialContent={content} />
  )
}

describe('Builder', () => {
  it('renders a section tab for each section', () => {
    renderBuilder()
    const tabs = screen.getByRole('navigation', { name: 'Seções' })
    expect(within(tabs).getByRole('button', { name: 'Wi-Fi' })).toBeInTheDocument()
  })

  it('renders the active section in the preview', () => {
    renderBuilder()
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
  })

  it('switching section tab changes the previewed section', () => {
    renderBuilder()
    const tabs = screen.getByRole('navigation', { name: 'Seções' })
    fireEvent.click(within(tabs).getByRole('button', { name: 'Wi-Fi' }))
    expect(screen.queryByText('Bem-vindo')).not.toBeInTheDocument()
  })
})
