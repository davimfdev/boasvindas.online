import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { blockSchema } from '@/lib/blocks/schema'
import { CarouselBlock } from '../CarouselBlock'

describe('carousel', () => {
  it('parses a carousel, tolerating an empty url row', () => {
    const r = blockSchema.safeParse({ id: 'c1', type: 'carousel', props: { images: [
      { url: 'https://x.com/a.jpg', alt: 'a' }, { url: '', alt: '' } ] } })
    expect(r.success).toBe(true)
  })

  it('renders one img per non-empty image and skips empty-url entries', () => {
    const { container } = render(<CarouselBlock block={{ id: 'c1', type: 'carousel', props: { images: [
      { url: 'https://x.com/a.jpg', alt: 'a' }, { url: '', alt: '' } ] } }} ctx={{ whatsapp: null }} />)
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })
})
