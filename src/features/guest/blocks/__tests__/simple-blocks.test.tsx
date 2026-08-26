import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockRenderer } from '../BlockRenderer'
import type { Block } from '@/lib/blocks/schema'

const ctx = { whatsapp: null }

describe('simple block renderers', () => {
  it('text block renders its text', () => {
    const b: Block = { id: '1', type: 'text', props: { text: 'Bem-vindo à casa' } }
    render(<BlockRenderer block={b} ctx={ctx} />)
    expect(screen.getByText('Bem-vindo à casa')).toBeInTheDocument()
  })

  it('image block renders an img with alt', () => {
    const b: Block = { id: '1', type: 'image', props: { url: 'https://x.test/a.jpg', alt: 'Sala' } }
    render(<BlockRenderer block={b} ctx={ctx} />)
    expect(screen.getByAltText('Sala')).toBeInTheDocument()
  })

  it('button block with map kind links to the map url', () => {
    const b: Block = { id: '1', type: 'button', props: { label: 'Ver no mapa', href: 'https://maps.test/x', kind: 'map' } }
    render(<BlockRenderer block={b} ctx={ctx} />)
    expect(screen.getByRole('link', { name: 'Ver no mapa' })).toHaveAttribute('href', 'https://maps.test/x')
  })

  it('button block with whatsapp kind builds a wa.me link', () => {
    const b: Block = { id: '1', type: 'button', props: { label: 'Zap', href: '+55 (11) 99999-0000', kind: 'whatsapp' } }
    render(<BlockRenderer block={b} ctx={ctx} />)
    expect(screen.getByRole('link', { name: 'Zap' })).toHaveAttribute('href', 'https://wa.me/5511999990000')
  })

  it('divider spacer variant renders a spacer', () => {
    const b: Block = { id: '1', type: 'divider', props: { variant: 'spacer' } }
    render(<BlockRenderer block={b} ctx={ctx} />)
    expect(screen.getByTestId('spacer')).toBeInTheDocument()
  })

  it('map block renders its label', () => {
    const b: Block = { id: '1', type: 'map', props: { query: 'Av Brasil 100', label: 'Como chegar' } }
    render(<BlockRenderer block={b} ctx={ctx} />)
    expect(screen.getByRole('link', { name: /Como chegar/ })).toBeInTheDocument()
  })

  it('whatsapp block falls back to ctx number', () => {
    const b: Block = { id: '1', type: 'whatsapp', props: { number: '' } }
    render(<BlockRenderer block={b} ctx={{ whatsapp: '+55 11 98888-0000' }} />)
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/5511988880000')
  })

  it('whatsapp block renders nothing when no number anywhere', () => {
    const b: Block = { id: '1', type: 'whatsapp', props: { number: '' } }
    const { container } = render(<BlockRenderer block={b} ctx={{ whatsapp: null }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
