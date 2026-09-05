import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CadastroPage } from '../CadastroPage'

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ register: vi.fn() }) }))

function renderCadastro() {
  render(<MemoryRouter><CadastroPage /></MemoryRouter>)
}

// O e-mail é a identidade da conta; deixar o teclado capitalizar a primeira
// letra é o caminho mais curto para criar uma conta que o dono não reencontra.
describe('campo de e-mail do cadastro', () => {
  it('desliga a capitalização automática', () => {
    renderCadastro()
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocapitalize', 'none')
  })

  it('desliga a autocorreção', () => {
    renderCadastro()
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocorrect', 'off')
  })
})
