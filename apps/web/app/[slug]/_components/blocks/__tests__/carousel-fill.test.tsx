import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CarouselBlock } from '../CarouselBlock'
import type { Block } from '@/lib/blocks/schema'

const car = (layout?: Block['layout']): Block => ({ id: 'c1', type: 'carousel', layout, props: { images: [{ url: 'https://x.com/a.jpg', alt: 'a' }] } })

describe('carousel fill', () => {
  it('uses a full-height track when layout.height is set', () => {
    const { container } = render(<CarouselBlock block={car({ width: 12, height: 300 })} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('[data-carousel-track]') as HTMLElement).className).toContain('h-full')
  })

  it('uses a fixed-height track with no layout.height', () => {
    const { container } = render(<CarouselBlock block={car()} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('[data-carousel-track]') as HTMLElement).className).toContain('h-72')
  })

  it('keeps real photo proportions with object-contain (never stretches)', () => {
    const { container } = render(<CarouselBlock block={car()} ctx={{ whatsapp: null }} />)
    const img = container.querySelector('img') as HTMLElement
    expect(img.className).toContain('object-contain')
    expect(img.className).not.toContain('object-cover')
  })
})
