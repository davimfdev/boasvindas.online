import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ImageBlock } from '../ImageBlock'
import type { Block } from '@/lib/blocks/schema'

const img = (layout?: Block['layout']): Block => ({ id: 'i1', type: 'image', layout, props: { url: 'https://x.com/a.jpg', alt: 'a' } })

describe('image fill', () => {
  it('fills height when layout.height is set', () => {
    const { container } = render(<ImageBlock block={img({ width: 12, height: 300 })} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('img') as HTMLElement).className).toContain('h-full')
  })

  it('keeps natural height with no layout.height', () => {
    const { container } = render(<ImageBlock block={img()} ctx={{ whatsapp: null }} />)
    expect((container.querySelector('img') as HTMLElement).className).not.toContain('h-full')
  })
})
