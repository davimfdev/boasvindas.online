'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CadastroPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const pwd = form.get('pwd') as string

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.get('name'), email, password: pwd }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error?.message ?? 'Erro ao cadastrar')
      setLoading(false)
      return
    }

    await signIn('credentials', { email, password: pwd, redirect: false })
    router.push('/app')
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0a0a0a]">Crie sua conta</h1>
      <p className="mt-2 text-black/55">Comece a montar suas páginas de boas-vindas.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pwd">Senha</Label>
          <Input id="pwd" name="pwd" type="password" required minLength={8} />
          <p className="text-xs text-black/40">Mínimo 8 caracteres</p>
        </div>
        <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>
          {loading ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-black/55">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-[#0d9488] hover:underline">Entrar</Link>
      </p>
    </div>
  )
}
