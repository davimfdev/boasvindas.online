import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuideBlock } from '../GuideBlock'
import type { Block } from '@/lib/blocks/schema'

const guide = (): Block => ({ id: 'g1', type: 'guide', props: { places: [
  { name: 'Bistrô', blurb: '', tags: ['comida'] },
  { name: 'Praia Central', blurb: '', tags: ['praia'] },
  { name: 'Quiosque', blurb: '', tags: ['praia', 'comida'] },
] } })

describe('guide filter', () => {
  it('filters places by the selected tag (multi-tag place shows under each)', () => {
    render(<GuideBlock block={guide()} ctx={{ whatsapp: null }} />)
    fireEvent.click(screen.getByRole('button', { name: 'praia' }))
    expect(screen.getByText('Praia Central')).toBeInTheDocument()
    expect(screen.getByText('Quiosque')).toBeInTheDocument()
    expect(screen.queryByText('Bistrô')).not.toBeInTheDocument()
  })

  it('renders no chip bar when no place has tags', () => {
    const noTags: Block = { id: 'g2', type: 'guide', props: { places: [{ name: 'X', blurb: '', tags: [] }] } }
    render(<GuideBlock block={noTags} ctx={{ whatsapp: null }} />)
    expect(screen.queryByRole('button', { name: 'Tudo' })).not.toBeInTheDocument()
  })
})
