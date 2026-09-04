import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'
import { notifyReauthSuccess, REAUTH_PARAM } from '@/lib/reauth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { login } = useAuth()
  // Opened as a popup by the builder: sign in, tell the opener, and get out of
  // the way. Navigating anywhere here would strand the host's unsaved page.
  const isReauth = params.get(REAUTH_PARAM) === '1'
  const from = (location.state as { from?: string } | null)?.from ?? '/app'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      await login(form.get('email') as string, form.get('pwd') as string)
      if (isReauth) {
        notifyReauthSuccess()
        return
      }
      navigate(from, { replace: true })
    } catch {
      setError('Email ou senha incorretos')
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0a0a0a]">
        {isReauth ? 'Sessão expirada' : 'Bem-vindo de volta'}
      </h1>
      <p className="mt-2 text-black/55">
        {isReauth
          ? 'Entre de novo para continuar salvando. Esta janela fecha sozinha.'
          : 'Acesse sua conta para gerenciar suas páginas.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pwd">Senha</Label>
          <Input id="pwd" name="pwd" type="password" required />
        </div>
        <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      {!isReauth && (
        <p className="mt-6 text-sm text-black/55">
          Não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-[#0d9488] hover:underline">Cadastrar</Link>
        </p>
      )}
    </div>
  )
}
