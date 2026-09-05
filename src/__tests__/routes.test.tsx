import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom'
import type { SessionUser } from '@/lib/auth'

/**
 * Proves the route tree survived the move from `<BrowserRouter>` to a data
 * router: same URLs, same layouts, same guard, same 404. It mounts the real
 * `appRoutes` through `createMemoryRouter`, which is the data router the app
 * now uses in production.
 */

// jsdom has no matchMedia and GSAP calls it on the landing page. Same reason
// vitest.setup.ts stubs ResizeObserver; kept local while this is the only file
// that mounts a GSAP page.
window.matchMedia = window.matchMedia ?? (((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia)

const { authMock } = vi.hoisted(() => ({
  authMock: { user: null as SessionUser | null, isLoading: false },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ ...authMock, login: vi.fn(), register: vi.fn(), logout: vi.fn() }),
}))

// The pages themselves are covered elsewhere; here only the routing matters, so
// their data fetching is stubbed to keep the assertions about which route won.
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ pages: [] }) },
  ApiError: class ApiError extends Error {},
}))

const { appRoutes } = await import('../App')

const HOST: SessionUser = { id: 'u1', email: 'host@example.com', name: 'Anfitriao' }

beforeEach(() => {
  authMock.user = null
  authMock.isLoading = false
})

function renderAt(path: string) {
  const router = createMemoryRouter(createRoutesFromElements(appRoutes), {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
  return router
}

/**
 * Which route pattern won, read from the router itself.
 *
 * Deterministic on purpose: most pages are lazy chunks, so waiting for their
 * DOM makes the assertion a race against a dynamic import under whatever load
 * the rest of the suite happens to be putting on the machine. Layout
 * assertions below still use the DOM, because layouts are imported eagerly.
 */
function matchedPath(router: ReturnType<typeof renderAt>): string | undefined {
  return router.state.matches.at(-1)?.route.path
}

describe('rotas públicas', () => {
  it('resolve a home em /', () => {
    expect(matchedPath(renderAt('/'))).toBe('/')
  })

  it('resolve o login em /login', () => {
    expect(matchedPath(renderAt('/login'))).toBe('/login')
  })

  // O AuthLayout envolve /login e /cadastro; o link do topo é dele, não da página.
  it('monta o login dentro do AuthLayout', () => {
    renderAt('/login')
    expect(screen.getByRole('link', { name: /boasvindas/ })).toHaveAttribute('href', '/')
  })

  it('resolve o cadastro em /cadastro', () => {
    expect(matchedPath(renderAt('/cadastro'))).toBe('/cadastro')
  })

  it('monta o cadastro dentro do AuthLayout', () => {
    renderAt('/cadastro')
    expect(screen.getByRole('link', { name: /boasvindas/ })).toHaveAttribute('href', '/')
  })

  it('mantém /:slug acessível sem sessão', () => {
    expect(matchedPath(renderAt('/casa-da-praia'))).toBe('/:slug')
  })
})

describe('rotas protegidas', () => {
  it('manda o visitante sem sessão para o login', async () => {
    const router = renderAt('/app')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('lembra de onde o visitante veio ao redirecionar', async () => {
    const router = renderAt('/app')
    await waitFor(() => expect(router.state.location.state).toEqual({ from: '/app' }))
  })

  it('resolve o dashboard em /app com sessão', () => {
    authMock.user = HOST
    expect(matchedPath(renderAt('/app'))).toBe('/app')
  })

  // O AppLayout traz o cabeçalho com o nome de quem está logado.
  it('monta o dashboard dentro do AppLayout', () => {
    authMock.user = HOST
    renderAt('/app')
    expect(screen.getByText('Anfitriao')).toBeInTheDocument()
  })

  it('resolve o construtor em /app/:id/edit com sessão', () => {
    authMock.user = HOST
    expect(matchedPath(renderAt('/app/p1/edit'))).toBe('/app/:id/edit')
  })

  it('monta o construtor dentro do AppLayout', () => {
    authMock.user = HOST
    renderAt('/app/p1/edit')
    expect(screen.getByText('Anfitriao')).toBeInTheDocument()
  })

  it('espera a sessão carregar antes de decidir', () => {
    authMock.isLoading = true
    renderAt('/app')
    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })
})

describe('rota desconhecida', () => {
  // O 404 é uma rota casada como qualquer outra, não um erro: o errorElement
  // padrão do data router não participa disto.
  it('resolve o 404 para um caminho profundo desconhecido', () => {
    renderAt('/nao/existe/mesmo')
    expect(screen.getByText('Página não encontrada')).toBeInTheDocument()
  })

  it('mantém a URL desconhecida sem redirecionar', () => {
    const router = renderAt('/nao/existe/mesmo')
    expect(router.state.location.pathname).toBe('/nao/existe/mesmo')
  })
})
