import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '@/lib/api'

export interface SessionUser {
  id: string
  email: string
  name: string
}

interface AuthContextValue {
  user: SessionUser | null
  /** False once the initial session lookup has settled. */
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get<{ user: SessionUser | null }>('/api/auth/session')
      .then((data) => { if (active) setUser(data.user) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: SessionUser }>('/api/auth/login', { email, password })
    setUser(data.user)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    await api.post('/api/auth/register', { name, email, password })
    const data = await api.post<{ user: SessionUser }>('/api/auth/login', { email, password })
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch((err) => {
      // A already-expired session still has to clear the local state.
      if (!(err instanceof ApiError)) throw err
    })
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
