import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchOverlay } from '../SearchOverlay'
import type { PageContent } from '@/lib/blocks/schema'

const content: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Café da manhã', level: 2 } } ] } ] }

describe('SearchOverlay', () => {
  it('navigates to the matched section when a result is clicked', () => {
    const onNavigate = vi.fn()
    render(<SearchOverlay content={content} onNavigate={onNavigate} onClose={() => {}} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'café' } })
    fireEvent.click(screen.getByText('Café da manhã'))
    expect(onNavigate).toHaveBeenCalledWith('s1')
  })
})
