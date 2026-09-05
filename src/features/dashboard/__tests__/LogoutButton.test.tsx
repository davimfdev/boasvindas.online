import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { LogoutButton } from '../LogoutButton'
import { UnsavedChangesProvider, useUnsavedChanges } from '@/lib/unsaved-changes'

/**
 * Logout is the one exit `useBlocker` cannot cover: it destroys the session
 * before it navigates, and that unmounts the builder on the spot. So the
 * question has to be asked before `logout()` runs.
 */

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }))

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ logout: logoutMock }) }))

let confirmSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  logoutMock.mockReset().mockResolvedValue(undefined)
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
})

afterEach(() => vi.restoreAllMocks())

/** Stands in for the builder: publishes unsaved work, and can unmount. */
function DirtyPublisher({ dirty }: { dirty: boolean }) {
  const { setUnsavedChanges } = useUnsavedChanges()
  setUnsavedChanges(dirty)
  return null
}

function renderLogout({ dirty = false, withBuilder = true } = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/app',
        element: (
          <UnsavedChangesProvider>
            {withBuilder && <DirtyPublisher dirty={dirty} />}
            <LogoutButton />
          </UnsavedChangesProvider>
        ),
      },
      { path: '/login', element: <p>entrar</p> },
    ],
    { initialEntries: ['/app'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

function clickLogout() {
  fireEvent.click(screen.getByRole('button', { name: /Sair/ }))
}

describe('LogoutButton com trabalho salvo', () => {
  it('sai sem perguntar nada', () => {
    renderLogout({ dirty: false })
    clickLogout()
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('encerra a sessão como antes', async () => {
    renderLogout({ dirty: false })
    clickLogout()
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1))
  })

  it('vai para o login', async () => {
    const router = renderLogout({ dirty: false })
    clickLogout()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})

describe('LogoutButton com trabalho não salvo', () => {
  it('pergunta antes de qualquer coisa', () => {
    renderLogout({ dirty: true })
    clickLogout()
    expect(confirmSpy).toHaveBeenCalledWith(
      'Você tem alterações que ainda não foram salvas. Sair agora vai descartá-las.',
    )
  })

  // O ponto central: cancelar não pode ter destruído a sessão antes.
  it('não encerra a sessão quando o anfitrião cancela', () => {
    renderLogout({ dirty: true })
    clickLogout()
    expect(logoutMock).not.toHaveBeenCalled()
  })

  it('não navega quando o anfitrião cancela', () => {
    const router = renderLogout({ dirty: true })
    clickLogout()
    expect(router.state.location.pathname).toBe('/app')
  })

  it('encerra a sessão quando o anfitrião confirma', async () => {
    confirmSpy.mockReturnValue(true)
    renderLogout({ dirty: true })
    clickLogout()
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1))
  })

  it('navega quando o anfitrião confirma', async () => {
    confirmSpy.mockReturnValue(true)
    const router = renderLogout({ dirty: true })
    clickLogout()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  // Um segundo diálogo faria o anfitrião confirmar duas vezes a mesma decisão.
  it('pergunta uma única vez num logout confirmado', async () => {
    confirmSpy.mockReturnValue(true)
    const router = renderLogout({ dirty: true })
    clickLogout()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })
})

describe('sinal compartilhado de alterações não salvas', () => {
  // Sem o construtor montado o sinal precisa estar limpo, senão o dashboard
  // herdaria a pergunta de uma edição que já terminou.
  it('não pergunta quando não há construtor montado', () => {
    renderLogout({ withBuilder: false })
    clickLogout()
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('sai direto quando não há construtor montado', async () => {
    renderLogout({ withBuilder: false })
    clickLogout()
    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1))
  })
})
