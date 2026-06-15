import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HeroBlock } from '../HeroBlock'
import type { Block } from '@/lib/blocks/schema'

const hero = (layout?: Block['layout']): Block => ({ id: 'h1', type: 'hero', layout, props: { greeting: 'Oi', propertyName: 'Casa' } })

describe('hero fill', () => {
  it('fills height when layout.height is set', () => {
    const { container } = render(<HeroBlock block={hero({ width: 12, height: 400 })} ctx={{ whatsapp: null }} />)
    expect((container.firstChild as HTMLElement).className).toContain('h-full')
  })

  it('keeps natural height with no layout.height', () => {
    const { container } = render(<HeroBlock block={hero()} ctx={{ whatsapp: null }} />)
    expect((container.firstChild as HTMLElement).className).not.toContain('h-full')
  })
})
