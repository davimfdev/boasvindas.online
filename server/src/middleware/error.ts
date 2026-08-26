import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505'

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === UNIQUE_VIOLATION
  )
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND' } })
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return

  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION', message: err.issues[0]?.message } })
    return
  }

  console.error('[api] unhandled error', err)
  res.status(500).json({ error: { code: 'INTERNAL' } })
}
