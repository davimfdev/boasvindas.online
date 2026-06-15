import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CarouselBlock } from '../CarouselBlock'
import type { Block } from '@/lib/blocks/schema'

const car = (layout?: Block['layout']): Block => ({ id: 'c1', type: 'carousel', layout, props: { images: [{ url: 'https://x.com/a.jpg', alt: 'a' }] } })

describe('carousel fill', () => {
  it('uses full-height figures when layout.height is set', () => {
    const { container } = render(<CarouselBlock block={car({ width: 12, height: 300 })} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('figure') as HTMLElement).className).toContain('h-full')
    expect((container.querySelector('img') as HTMLElement).className).not.toContain('h-56')
  })

  it('uses fixed-height slides with no layout.height', () => {
    const { container } = render(<CarouselBlock block={car()} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('img') as HTMLElement).className).toContain('h-56')
  })
})
