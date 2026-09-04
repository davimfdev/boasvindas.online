import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom'
import { appRoutes } from './App'
import { AuthProvider } from '@/lib/auth'
import './index.css'

// Created once, outside render: rebuilding the router would drop history state.
const router = createBrowserRouter(createRoutesFromElements(appRoutes))

// AuthProvider sits outside RouterProvider because a data router accepts no
// wrapper between itself and the routes. It uses no router hook — only the API
// client — so nothing about its behaviour changes here.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
