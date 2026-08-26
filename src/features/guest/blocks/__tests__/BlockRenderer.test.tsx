import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockRenderer } from '../BlockRenderer'
import type { Block } from '@/lib/blocks/schema'

describe('BlockRenderer', () => {
  it('renders a heading block as its text', () => {
    const block: Block = { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } }
    render(<BlockRenderer block={block} ctx={{ whatsapp: null }} />)
    expect(screen.getByText('Bem-vindo')).toBeInTheDocument()
  })

  it('renders nothing for an unknown block type (defensive)', () => {
    const block = { id: 'b1', type: 'mystery', props: {} } as unknown as Block
    const { container } = render(<BlockRenderer block={block} ctx={{ whatsapp: null }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
