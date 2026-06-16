import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('applies the block span as a grid-column span on the guest page', () => {
    const content: PageContent = { nav: 'onepage', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'heading', props: { text: 'Olá', level: 1 }, layout: { width: 6 } } ] } ] }
    const { container } = render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
    const wrapper = container.querySelector('[data-block="b1"]') as HTMLElement
    expect(wrapper.style.gridColumn).toBe('span 6')
  })

  it('lays the section out in a 12-column grid container', () => {
    const content: PageContent = { nav: 'onepage', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
    const { container } = render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
    expect(container.querySelector('.md\\:grid-cols-12')).not.toBeNull()
  })

  it('applies themed css vars on the wrapper when content has a theme', () => {
    const content: PageContent = { nav: 'onepage', theme: { preset: 'rustic' }, sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
    const { container } = render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
    const wrapper = container.querySelector('.guest-site') as HTMLElement
    expect(wrapper.style.getPropertyValue('--g-accent')).toBe('#5d4017')
  })

  it('leaves the wrapper unstyled (data-theme only) when content has no theme', () => {
    const content: PageContent = { nav: 'onepage', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
    const { container } = render(<GuestSite title="T" whatsapp={null} theme="rustic" content={content} />)
    const wrapper = container.querySelector('.guest-site') as HTMLElement
    expect(wrapper.style.getPropertyValue('--g-accent')).toBe('')
    expect(wrapper.getAttribute('data-theme')).toBe('rustic')
  })

  it('gives height-resized media a full-height parent so it can fill', () => {
    const content: PageContent = { nav: 'onepage', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'image', layout: { width: 12, height: 320 }, props: { url: 'https://x.com/a.jpg', alt: 'a' } } ] } ] }
    const { container } = render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
    const img = container.querySelector('[data-block="b1"] img') as HTMLElement
    expect(container.querySelector('[data-block="b1"] .h-full')).not.toBeNull()
    expect(img.className).toContain('h-full')
  })

  it('opens the search overlay from the header button', () => {
    const content: PageContent = { nav: 'buttons', sections: [
      { id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
    render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
    expect(screen.queryByPlaceholderText('O que você procura?')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Buscar na página'))
    expect(screen.getByPlaceholderText('O que você procura?')).toBeInTheDocument()
  })
})
