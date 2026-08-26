import type { SessionUser } from '../services/session.js'

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser
    }
  }
}

export {}
