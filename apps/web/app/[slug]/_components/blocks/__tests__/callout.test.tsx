import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { CalloutBlock } from '../CalloutBlock'

describe('callout', () => {
  it('parses a valid callout block', () => {
    const r = blockSchema.safeParse({ id: 'c1', type: 'callout', props: { variant: 'tip', icon: 'Lightbulb', text: 'Oi' } })
    expect(r.success).toBe(true)
  })

  it('renders its text', () => {
    render(<CalloutBlock block={{ id: 'c1', type: 'callout', props: { variant: 'warning', icon: 'Lightbulb', text: 'Cuidado' } }} ctx={{ whatsapp: null }} />)
    expect(screen.getByText('Cuidado')).toBeInTheDocument()
  })
})
