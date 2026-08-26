import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { CadastroPage } from '@/pages/CadastroPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EditPage } from '@/pages/EditPage'
import { GuestPage } from '@/pages/GuestPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** Replaces the Next.js middleware guard on /app/*. */
function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f3] font-grotesk text-black/40">
      Carregando…
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/:id/edit" element={<EditPage />} />
        </Route>
      </Route>

      <Route path="/:slug" element={<GuestPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
