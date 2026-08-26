import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockRenderer } from '../BlockRenderer'
import type { Block } from '@/lib/blocks/schema'

const ctx = { whatsapp: null }

it('hero renders the property name', () => {
  const b: Block = { id: '1', type: 'hero', props: { greeting: 'Bem-vindo', propertyName: 'Apartamento 101' } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('Apartamento 101')).toBeInTheDocument()
})

it('hero renders the greeting', () => {
  const b: Block = { id: '1', type: 'hero', props: { greeting: 'Sinta-se em casa', propertyName: 'X' } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('Sinta-se em casa')).toBeInTheDocument()
})

it('wifi renders the ssid', () => {
  const b: Block = { id: '1', type: 'wifi', props: { ssid: 'CasaPraia_5G', password: 'segredo123' } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('CasaPraia_5G')).toBeInTheDocument()
})

it('wifi renders the password', () => {
  const b: Block = { id: '1', type: 'wifi', props: { ssid: 'X', password: 'segredo123' } }
  render(<BlockRenderer block={b} ctx={ctx} />)
  expect(screen.getByText('segredo123')).toBeInTheDocument()
})
