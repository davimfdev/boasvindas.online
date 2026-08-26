import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { LinkCardBlock } from '../LinkCardBlock'

describe('linkcard', () => {
  it('parses a link card, tolerating an empty href row', () => {
    const r = blockSchema.safeParse({ id: 'l1', type: 'linkcard', props: { title: 'T', text: '', links: [
      { label: 'Site', href: 'https://x.com' }, { label: 'vazio', href: '' } ] } })
    expect(r.success).toBe(true)
  })

  it('renders links with an href and omits empty-href ones', () => {
    render(<LinkCardBlock block={{ id: 'l1', type: 'linkcard', props: { title: 'T', text: '', links: [
      { label: 'Site', href: 'https://x.com' }, { label: 'Vazio', href: '' } ] } }} ctx={{ whatsapp: null }} />)
    expect(screen.getByRole('link', { name: 'Site' })).toHaveAttribute('href', 'https://x.com')
    expect(screen.queryByText('Vazio')).not.toBeInTheDocument()
  })
})
