import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GuestSite } from '../GuestSite'
import type { PageContent } from '@/lib/blocks/schema'

const content: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 'home', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } } ] },
    { id: 'wifi', title: 'Wi-Fi', icon: 'Wifi', blocks: [
      { id: 'b2', type: 'wifi', props: { ssid: 'NetX', password: 'p1' } } ] },
  ],
}

describe('GuestSite', () => {
  it('renders a persistent nav control for every section', () => {
    render(<GuestSite title="Casa" whatsapp={null} theme="modern" content={content} />)
    expect(screen.getByRole('button', { name: /Wi-Fi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Início/i })).toBeInTheDocument()
  })

  it('shows the first section content on initial render', () => {
    render(<GuestSite title="Casa" whatsapp={null} theme="modern" content={content} />)
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
  })

  it('does not render an inactive section content on initial render', () => {
    render(<GuestSite title="Casa" whatsapp={null} theme="modern" content={content} />)
    expect(screen.queryByText('NetX')).not.toBeInTheDocument()
  })
})
