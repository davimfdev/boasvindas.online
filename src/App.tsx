import { lazy, Suspense, type ReactElement } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'

// Route-level code splitting: the builder (dnd-kit, GSAP) and the dashboard
// must not ship to someone who only opens the landing page or a guest link.
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const CadastroPage = lazy(() => import('@/pages/CadastroPage').then((m) => ({ default: m.CadastroPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const EditPage = lazy(() => import('@/pages/EditPage').then((m) => ({ default: m.EditPage })))
const GuestPage = lazy(() => import('@/pages/GuestPage').then((m) => ({ default: m.GuestPage })))

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

// Mirrors GuestPage's own data-loading placeholder so the route chunk and
// the page data load behind the same blank background, with no flash.
function GuestPageLoader() {
  return <div className="guest-site min-h-screen bg-gbg" />
}

function withSuspense(element: ReactElement, fallback: ReactElement = <FullScreenLoader />) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={withSuspense(<HomePage />)} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={withSuspense(<LoginPage />)} />
        <Route path="/cadastro" element={withSuspense(<CadastroPage />)} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/app" element={withSuspense(<DashboardPage />)} />
          <Route path="/app/:id/edit" element={withSuspense(<EditPage />)} />
        </Route>
      </Route>

      <Route path="/:slug" element={withSuspense(<GuestPage />, <GuestPageLoader />)} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
