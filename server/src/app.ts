import express, { type Express } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import { attachUser } from './middleware/require-auth.js'
import { errorHandler, notFound } from './middleware/error.js'
import { authRouter } from './routes/auth.js'
import { healthRouter } from './routes/health.js'
import { mediaRouter } from './routes/media.js'
import { pagesRouter } from './routes/pages.js'
import { publicRouter } from './routes/public.js'

export function createApp(): Express {
  const app = express()

  // Nginx Proxy Manager terminates TLS and sets X-Forwarded-*; without this
  // req.secure is false and Secure cookies would be dropped.
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  )
  app.use(cookieParser())

  // Health must answer before any parsing or auth work.
  app.use(healthRouter)

  // No signed webhooks exist in this API, so a JSON parser is safe globally.
  // Mount raw-body handlers ahead of this line if one is ever added.
  // Image uploads are exempt from that rule: express.json only consumes bodies
  // whose Content-Type is JSON, so a multipart stream still reaches multer intact.
  app.use(express.json({ limit: '1mb' }))
  app.use(attachUser)

  app.use('/api/auth', authRouter)
  app.use('/api/media', mediaRouter)
  app.use('/api/pages', pagesRouter)
  app.use('/api/public', publicRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
