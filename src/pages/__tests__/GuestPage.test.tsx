import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GuestPage } from '../GuestPage'
import { api } from '@/lib/api'
import type { PublicPage } from '@/lib/types'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

function renderAtSlug(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/${slug}`]}>
      <Routes>
        <Route path="/:slug" element={<GuestPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function metaContent(name: string) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')
}

const publishedPage: PublicPage = {
  slug: 'casa-praia',
  title: 'Casa da Praia',
  subtitle: 'Guia completo para sua estadia',
  status: 'published',
  theme: 'modern',
  whatsapp: null,
  content: { nav: 'buttons', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Bem-vindo', level: 1 } } ] } ] },
}

describe('GuestPage document metadata', () => {
  it('sets the document title from the published page title once loaded', async () => {
    vi.mocked(api.get).mockResolvedValue({ page: publishedPage })
    renderAtSlug('casa-praia')
    await waitFor(() => expect(document.title).toBe('Casa da Praia — Boas-vindas'))
  })

  it('sets the meta description from the page subtitle once loaded', async () => {
    vi.mocked(api.get).mockResolvedValue({ page: publishedPage })
    renderAtSlug('casa-praia')
    await waitFor(() => expect(metaContent('description')).toBe('Guia completo para sua estadia'))
  })

  it('marks a published page as indexable', async () => {
    vi.mocked(api.get).mockResolvedValue({ page: publishedPage })
    renderAtSlug('casa-praia')
    await waitFor(() => expect(metaContent('robots')).toBe('index, follow'))
  })

  it('marks an unpublished draft page as not indexable', async () => {
    const draftPage: PublicPage = { ...publishedPage, status: 'draft', content: undefined }
    vi.mocked(api.get).mockResolvedValue({ page: draftPage })
    renderAtSlug('casa-praia')
    await waitFor(() => expect(screen.getByText('Em breve')).toBeInTheDocument())
    expect(metaContent('robots')).toBe('noindex')
  })

  it('sets a not-found title and noindex when the slug does not resolve', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('not found'))
    renderAtSlug('inexistente')
    await waitFor(() => expect(document.title).toBe('Página não encontrada — boasvindas.online'))
    expect(metaContent('robots')).toBe('noindex')
  })
})
