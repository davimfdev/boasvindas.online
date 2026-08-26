import type { NextFunction, Request, Response } from 'express'
import { config } from '../config.js'
import { readSessionToken } from '../services/session.js'

/** Populates req.user when a valid session cookie is present. Never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  req.user = (await readSessionToken(req.cookies?.[config.sessionCookieName])) ?? undefined
  next()
}

/** Rejects with the same 401 envelope the Next.js route handlers returned. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED' } })
    return
  }
  next()
}
