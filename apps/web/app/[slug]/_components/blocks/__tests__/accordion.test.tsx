import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { AccordionBlock } from '../AccordionBlock'

import type { Block } from '@/lib/blocks/schema'
const block: Block = { id: 'a1', type: 'accordion', props: { items: [
  { icon: 'Info', title: 'Como ligar a TV', summary: 'resumo', body: 'aperte o botão' } ] } }

describe('accordion', () => {
  it('parses a valid accordion block', () => {
    expect(blockSchema.safeParse(block).success).toBe(true)
  })

  it('reveals the body only after clicking the row', () => {
    render(<AccordionBlock block={block} ctx={{ whatsapp: null }} />)
    expect(screen.queryByText('aperte o botão')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Como ligar a TV'))
    expect(screen.getByText('aperte o botão')).toBeInTheDocument()
  })
})
