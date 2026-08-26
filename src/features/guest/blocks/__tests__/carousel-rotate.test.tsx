import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { CarouselBlock } from '../CarouselBlock'
import type { Block } from '@/lib/blocks/schema'

const car = (): Block => ({ id: 'c1', type: 'carousel', props: { images: [
  { url: 'https://x.com/a.jpg', alt: 'a' },
  { url: 'https://x.com/b.jpg', alt: 'b' },
] } })

describe('carousel auto-rotate', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('advances the track to the next slide after the interval', () => {
    const { container } = render(<CarouselBlock block={car()} ctx={{ whatsapp: null }} />)
    const track = container.querySelector('[data-carousel-track]') as HTMLElement
    expect(track.style.transform).toBe('translateX(-0%)')
    act(() => { vi.advanceTimersByTime(4000) })
    expect(track.style.transform).toBe('translateX(-100%)')
  })

  it('wraps back to the first slide after the last', () => {
    const { container } = render(<CarouselBlock block={car()} ctx={{ whatsapp: null }} />)
    const track = container.querySelector('[data-carousel-track]') as HTMLElement
    act(() => { vi.advanceTimersByTime(8000) })
    expect(track.style.transform).toBe('translateX(-0%)')
  })

  it('does not rotate a single-image carousel', () => {
    const single: Block = { id: 'c1', type: 'carousel', props: { images: [{ url: 'https://x.com/a.jpg', alt: 'a' }] } }
    const { container } = render(<CarouselBlock block={single} ctx={{ whatsapp: null }} />)
    const track = container.querySelector('[data-carousel-track]') as HTMLElement
    act(() => { vi.advanceTimersByTime(8000) })
    expect(track.style.transform).toBe('translateX(-0%)')
  })
})
