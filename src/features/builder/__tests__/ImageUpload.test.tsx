import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImageUpload } from '../ImageUpload'
import { ApiError } from '@/lib/api'

const upload = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { upload },
}))

const PAGE_ID = '22222222-2222-4222-8222-222222222222'
const file = () => new File(['bytes'], 'foto.png', { type: 'image/png' })

beforeEach(() => {
  upload.mockReset()
})

describe('ImageUpload', () => {
  it('invites the host to drop or pick a file', () => {
    render(<ImageUpload value="" pageId={PAGE_ID} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /arraste uma imagem/i })).toBeInTheDocument()
  })

  it('reports the stored URL after a picked file is sent', async () => {
    upload.mockResolvedValue({ media: { url: '/api/media/abc' } })
    const onChange = vi.fn()
    render(<ImageUpload value="" pageId={PAGE_ID} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file()] } })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/api/media/abc'))
  })

  it('reports the stored URL after a dropped file is sent', async () => {
    upload.mockResolvedValue({ media: { url: '/api/media/xyz' } })
    const onChange = vi.fn()
    render(<ImageUpload value="" pageId={PAGE_ID} onChange={onChange} />)

    fireEvent.drop(screen.getByRole('button', { name: /arraste uma imagem/i }), {
      dataTransfer: { files: [file()] },
    })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/api/media/xyz'))
  })

  it('sends the page the image belongs to', async () => {
    upload.mockResolvedValue({ media: { url: '/api/media/abc' } })
    render(<ImageUpload value="" pageId={PAGE_ID} onChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file()] } })

    await waitFor(() => expect(upload.mock.calls[0][1].get('pageId')).toBe(PAGE_ID))
  })

  it('announces that it is sending while the upload is in flight', async () => {
    upload.mockReturnValue(new Promise(() => {}))
    render(<ImageUpload value="" pageId={PAGE_ID} onChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file()] } })

    expect(await screen.findByRole('button', { name: /enviando/i })).toBeInTheDocument()
  })

  it('shows the API message when the format is refused', async () => {
    upload.mockRejectedValue(
      new ApiError(415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Envie uma imagem JPG, PNG, WebP ou AVIF' }),
    )
    render(<ImageUpload value="" pageId={PAGE_ID} onChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file()] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Envie uma imagem JPG, PNG, WebP ou AVIF')
  })

  it('translates a bare error code into Portuguese', async () => {
    upload.mockRejectedValue(new ApiError(401, { code: 'UNAUTHORIZED' }))
    render(<ImageUpload value="" pageId={PAGE_ID} onChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file()] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/sessão expirou/i)
  })

  it('explains a network failure without exposing the raw error', async () => {
    upload.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<ImageUpload value="" pageId={PAGE_ID} onChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file()] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/falha na conexão/i)
  })

  it('refuses to send when no page is open', async () => {
    render(<ImageUpload value="" pageId={undefined} onChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file()] } })

    await waitFor(() => expect(upload).not.toHaveBeenCalled())
  })

  it('previews the image already set on the block', () => {
    render(<ImageUpload value="https://exemplo.com/foto.jpg" pageId={PAGE_ID} onChange={vi.fn()} />)
    expect(screen.getByAltText(/pré-visualização/i)).toHaveAttribute('src', 'https://exemplo.com/foto.jpg')
  })
})
