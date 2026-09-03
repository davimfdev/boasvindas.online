import { Router, type RequestHandler } from 'express'
import { client } from '../db/index.js'

export const healthRouter: Router = Router()

const ok: RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok' })
}

// Direct container probe: Docker and Coolify hit boasvindas-api:3000/health.
healthRouter.get('/health', ok)

// Same probe reachable through the reverse proxy, which only forwards /api/.
healthRouter.get('/api/health', ok)

/** Keeps a stuck query from pending the readiness probe forever. */
const READY_QUERY_TIMEOUT_MS = 2000

/**
 * Real connectivity check: liveness above only proves the process is running,
 * which is how a database outage went unnoticed while /health stayed green.
 */
async function isDatabaseReachable(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('readiness query timed out')), READY_QUERY_TIMEOUT_MS)
  })

  try {
    await Promise.race([client`select 1`, timeout])
    return true
  } catch (err) {
    // Detail (driver message, hostname, credentials) stays server-side only.
    console.error('[api] readiness check failed', err)
    return false
  } finally {
    clearTimeout(timer!)
  }
}

const ready: RequestHandler = async (_req, res) => {
  const reachable = await isDatabaseReachable()
  if (reachable) {
    res.status(200).json({ status: 'ok', database: 'ok' })
  } else {
    res.status(503).json({ status: 'degraded', database: 'unreachable' })
  }
}

healthRouter.get('/health/ready', ready)
healthRouter.get('/api/health/ready', ready)
