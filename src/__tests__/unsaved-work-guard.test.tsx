import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { Builder } from '@/features/builder/Builder'
import type { PageContent } from '@/lib/blocks/schema'

/**
 * The two guards meeting in the real tree.
 *
 * `useBlocker` covers router navigation, and the shared flag covers logout,
 * which destroys the session before navigating. Only here can it be shown that
 * they compose: that the provider really is wired into AppLayout, that the
 * wordmark is protected without knowing anything about the builder, and that a
 * confirmed logout asks exactly once rather than twice.
 */

const { authState, logoutMock } = vi.hoisted(() => ({
  authState: { user: null as { id: string; name: string } | null, rerender: () => {} },
  logoutMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: authState.user, logout: logoutMock }),
}))

// The network is not what is under test here.
vi.mock('@/features/builder/useAutosave', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/builder/useAutosave')>()
  return { ...actual, useAutosave: () => ({ status: 'idle' as const, retry: vi.fn() }) }
})

const content: PageContent = {
  nav: 'buttons',
  sections: [{ id: 's1', title: 'Início', icon: 'Home', blocks: [] }],
}

const DISCARD = 'Você tem alterações que ainda não foram salvas. Sair agora vai descartá-las.'

let confirmSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  authState.user = { id: 'u1', name: 'Anfitriao' }
  logoutMock.mockReset().mockImplementation(async () => {
    authState.user = null
    authState.rerender()
  })
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
})

afterEach(() => vi.restoreAllMocks())

/** Stands in for RequireAuth: swaps the outlet for a redirect once logged out. */
function Guard() {
  const [, force] = useState(0)
  authState.rerender = () => force((n) => n + 1)
  if (!authState.user) return <Navigate to="/login" replace />
  return <Outlet />
}

function renderBuilderInApp() {
  const router = createMemoryRouter(
    [
      {
        element: <Guard />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: '/app/p1/edit',
                element: (
                  <Builder pageId="p1" title="Casa" whatsapp={null} theme="modern" initialContent={content} />
                ),
              },
              { path: '/app', element: <p>painel</p> },
            ],
          },
        ],
      },
      { path: '/login', element: <p>entrar</p> },
    ],
    { initialEntries: ['/app/p1/edit'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

/** Adding a block from the palette is what marks the store dirty. */
function makeDirty() {
  fireEvent.click(screen.getByRole('button', { name: /Texto/ }))
}

function clickWordmark() {
  fireEvent.click(screen.getByRole('link', { name: /boasvindas/ }))
}

function clickLogout() {
  fireEvent.click(screen.getByRole('button', { name: /Sair/ }))
}

describe('o wordmark do cabeçalho', () => {
  // Nada no AppLayout sabe do construtor: quem protege é o blocker.
  it('leva ao painel quando não há nada por salvar', async () => {
    const router = renderBuilderInApp()
    clickWordmark()
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))
  })

  it('pergunta antes de descartar trabalho não salvo', () => {
    renderBuilderInApp()
    makeDirty()
    clickWordmark()
    expect(confirmSpy).toHaveBeenCalledWith(DISCARD)
  })

  it('mantém o construtor quando o anfitrião cancela', () => {
    const router = renderBuilderInApp()
    makeDirty()
    clickWordmark()
    expect(router.state.location.pathname).toBe('/app/p1/edit')
  })

  it('sai quando o anfitrião confirma', async () => {
    const router = renderBuilderInApp()
    makeDirty()
    confirmSpy.mockReturnValue(true)
    clickWordmark()
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))
  })
})

describe('o logout a partir do construtor', () => {
  it('não encerra a sessão quando o anfitrião cancela', () => {
    renderBuilderInApp()
    makeDirty()
    clickLogout()
    expect(logoutMock).not.toHaveBeenCalled()
  })

  it('deixa o construtor no lugar quando o anfitrião cancela', () => {
    const router = renderBuilderInApp()
    makeDirty()
    clickLogout()
    expect(router.state.location.pathname).toBe('/app/p1/edit')
  })

  it('encerra a sessão quando o anfitrião confirma', async () => {
    confirmSpy.mockReturnValue(true)
    const router = renderBuilderInApp()
    makeDirty()
    clickLogout()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(logoutMock).toHaveBeenCalledTimes(1)
  })

  // Confirmar a mesma decisão duas vezes seria um bug de UX; o construtor
  // desmonta junto com a sessão, antes que o blocker chegue a ver a navegação.
  it('pergunta uma única vez num logout confirmado', async () => {
    confirmSpy.mockReturnValue(true)
    const router = renderBuilderInApp()
    makeDirty()
    clickLogout()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it('não pergunta nada quando tudo está salvo', async () => {
    const router = renderBuilderInApp()
    clickLogout()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(confirmSpy).not.toHaveBeenCalled()
  })
})

describe('o sinal compartilhado depois que o construtor sai de cena', () => {
  // Sair do construtor de forma limpa não pode deixar o painel achando que
  // ainda há trabalho pendente.
  it('deixa o logout do painel intocado', async () => {
    const router = renderBuilderInApp()
    clickWordmark()
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))

    clickLogout()
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1))
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('não pergunta no painel nem depois de uma edição descartada', async () => {
    const router = renderBuilderInApp()
    makeDirty()
    confirmSpy.mockReturnValue(true)
    clickWordmark()
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))

    confirmSpy.mockClear()
    clickLogout()
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1))
    expect(confirmSpy).not.toHaveBeenCalled()
  })
})
