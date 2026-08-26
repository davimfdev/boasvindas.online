import { SignJWT, jwtVerify } from 'jose'
import type { CookieOptions, Response } from 'express'
import { config } from '../config.js'

export interface SessionUser {
  id: string
  email: string
  name: string
}

const secret = new TextEncoder().encode(config.authSecret)
const ALG = 'HS256'

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${config.sessionMaxAgeSeconds}s`)
    .sign(secret)
}

export async function readSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] })
    if (!payload.sub) return null
    return {
      id: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
    }
  } catch {
    return null
  }
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // Secure requires HTTPS; Nginx Proxy Manager terminates TLS in production.
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionMaxAgeSeconds * 1000,
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.sessionCookieName, token, cookieOptions())
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.sessionCookieName, { ...cookieOptions(), maxAge: undefined })
}
