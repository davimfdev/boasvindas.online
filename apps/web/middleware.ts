import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const loggedIn = !!req.auth
  const isApp = req.nextUrl.pathname.startsWith('/app')
  if (isApp && !loggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
})

export const config = { matcher: ['/app/:path*'] }
