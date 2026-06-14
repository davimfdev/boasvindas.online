import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockRenderer } from '../BlockRenderer'
import type { Block } from '@/lib/blocks/schema'

const ctx = { whatsapp: null }

it('checkin renders the address', () => {
  const b: Block = { id: '1', type: 'checkin', props: { time: '14:00', address: 'Rua das Flores, 10', instructions: 'Pegue a chave na portaria' } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('Rua das Flores, 10')).toBeInTheDocument()
})

it('checkin renders the access code when present', () => {
  const b: Block = { id: '1', type: 'checkin', props: { time: '14:00', address: 'X', accessCode: '4827', instructions: '' } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('4827')).toBeInTheDocument()
})

it('checkout renders a checklist item', () => {
  const b: Block = { id: '1', type: 'checkout', props: { time: '11:00', items: ['Feche as janelas'] } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('Feche as janelas')).toBeInTheDocument()
})

it('rules renders an item label', () => {
  const b: Block = { id: '1', type: 'rules', props: { items: [{ icon: 'Ban', label: 'Proibido fumar' }] } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('Proibido fumar')).toBeInTheDocument()
})

it('guide renders a place name and its map link', () => {
  const b: Block = { id: '1', type: 'guide', props: { places: [{ name: 'Padaria Central', blurb: 'Pães frescos', distance: '200m', mapUrl: 'https://maps.test/p' }] } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('Padaria Central')).toBeInTheDocument()
  expect(screen.getByRole('link')).toHaveAttribute('href', 'https://maps.test/p')
})

it('emergency renders a tap-to-call contact', () => {
  const b: Block = { id: '1', type: 'emergency', props: { contacts: [{ label: 'SAMU', phone: '192' }] } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByRole('link', { name: /SAMU/ })).toHaveAttribute('href', 'tel:192')
})
