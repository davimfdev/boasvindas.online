import { Router, type RequestHandler } from 'express'

export const healthRouter: Router = Router()

const ok: RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok' })
}

// Direct container probe: Docker and Coolify hit boasvindas-api:3000/health.
healthRouter.get('/health', ok)

// Same probe reachable through the reverse proxy, which only forwards /api/.
healthRouter.get('/api/health', ok)
