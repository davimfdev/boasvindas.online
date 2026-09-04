import { describe, it, expect, vi, beforeEach, afterEach, type Mock, type MockInstance } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { REAUTH_SUCCESS } from '@/lib/reauth'

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ login: loginMock }) }))

const ORIGIN = window.location.origin

let postMessage: Mock
let close: MockInstance

beforeEach(() => {
  loginMock.mockReset().mockResolvedValue(undefined)
  postMessage = vi.fn()
  vi.stubGlobal('opener', { postMessage })
  close = vi.spyOn(window, 'close').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Renders at the given URL and reports where the router ended up. */
function renderLogin(url: string) {
  const seen = { path: url }
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<Landed onRender={() => { seen.path = '/app' }} />} />
      </Routes>
    </MemoryRouter>,
  )
  return seen
}

function Landed({ onRender }: { onRender: () => void }) {
  onRender()
  return <p>painel</p>
}

function signIn() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'host@example.com' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-correta' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginPage in reauth mode', () => {
  it('announces that the session expired', () => {
    renderLogin('/login?reauth=1')
    expect(screen.getByRole('heading', { name: 'Sessão expirada' })).toBeInTheDocument()
  })

  // Following it inside a 420px popup would strand the half-finished sign-in.
  it('hides the link to registration', () => {
    renderLogin('/login?reauth=1')
    expect(screen.queryByRole('link', { name: 'Cadastrar' })).not.toBeInTheDocument()
  })

  it('signs in through the usual auth flow', async () => {
    renderLogin('/login?reauth=1')
    signIn()
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('host@example.com', 'senha-correta'))
  })

  it('tells the opener the session is back', async () => {
    renderLogin('/login?reauth=1')
    signIn()
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ type: REAUTH_SUCCESS }, ORIGIN))
  })

  it('closes itself once it has signed in', async () => {
    renderLogin('/login?reauth=1')
    signIn()
    await waitFor(() => expect(close).toHaveBeenCalled())
  })

  it('stays put instead of navigating to the dashboard', async () => {
    const seen = renderLogin('/login?reauth=1')
    signIn()
    await waitFor(() => expect(close).toHaveBeenCalled())
    expect(seen.path).toBe('/login?reauth=1')
  })

  it('reports bad credentials without telling the opener anything', async () => {
    loginMock.mockRejectedValue(new Error('nope'))
    renderLogin('/login?reauth=1')
    signIn()
    await screen.findByText('Email ou senha incorretos')
    expect(postMessage).not.toHaveBeenCalled()
  })
})

describe('LoginPage in its normal mode', () => {
  it('keeps the usual greeting', () => {
    renderLogin('/login')
    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument()
  })

  it('keeps the link to registration', () => {
    renderLogin('/login')
    expect(screen.getByRole('link', { name: 'Cadastrar' })).toBeInTheDocument()
  })

  it('goes to the dashboard after signing in', async () => {
    const seen = renderLogin('/login')
    signIn()
    await waitFor(() => expect(seen.path).toBe('/app'))
  })

  it('never posts a reauth message', async () => {
    const seen = renderLogin('/login')
    signIn()
    await waitFor(() => expect(seen.path).toBe('/app'))
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('never closes the window', async () => {
    const seen = renderLogin('/login')
    signIn()
    await waitFor(() => expect(seen.path).toBe('/app'))
    expect(close).not.toHaveBeenCalled()
  })
})
