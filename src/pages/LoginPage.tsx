import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
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
      navigate(from, { replace: true })
    } catch {
      setError('Email ou senha incorretos')
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0a0a0a]">Bem-vindo de volta</h1>
      <p className="mt-2 text-black/55">Acesse sua conta para gerenciar suas páginas.</p>

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

      <p className="mt-6 text-sm text-black/55">
        Não tem conta?{' '}
        <Link to="/cadastro" className="font-semibold text-[#0d9488] hover:underline">Cadastrar</Link>
      </p>
    </div>
  )
}
