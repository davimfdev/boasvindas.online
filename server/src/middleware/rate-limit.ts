/**
 * Rate limiting for the three routes an attacker gains something by hammering:
 * login (brute force), register (mass account creation) and upload (flood).
 *
 * Every limiter is mounted on its own route, never globally. The guest page and
 * the images it loads are public and unmetered on purpose — a popular listing
 * must not throttle itself.
 *
 * Keys come from `req.ip`, which behind Nginx Proxy Manager is the real client
 * address: the proxy appends the socket address to X-Forwarded-For and
 * `trust proxy` is 1, so a client cannot pick its own key by sending the header.
 * See docs/VPS_MIGRATION.md, section 7.
 */

import { MemoryStore, ipKeyGenerator, rateLimit, type Options, type RateLimitRequestHandler } from 'express-rate-limit'
import type { Request, Response } from 'express'
import { normalizeEmail } from '../utils/email.js'

const MINUTES = 60 * 1000
const HOURS = 60 * MINUTES

/** Every store handed out, so the test helper at the bottom can clear them. */
const stores: MemoryStore[] = []

function createLimiter(options: Partial<Options>): RateLimitRequestHandler {
  const store = new MemoryStore()
  stores.push(store)

  return rateLimit({
    store,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Retry-After is written by the library from this limiter's own window
    // before the handler runs; setting it here could contradict the RateLimit
    // headers that accompany it.
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Muitas tentativas. Tente novamente em alguns minutos.',
        },
      })
    },
    ...options,
  })
}

/**
 * Brute force against one account.
 *
 * The key carries the e-mail only to separate buckets: the password is never
 * read, nothing is stored and no query runs, so being limited reveals nothing
 * about whether the account exists — the response is identical either way.
 *
 * `skipSuccessfulRequests` means a successful login does not spend budget; it
 * does not let a request through once the bucket is already exhausted.
 */
export const loginAccountLimiter = createLimiter({
  windowMs: 15 * MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  // Same helper the routes use, so the bucket and the account are the same thing.
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${normalizeEmail(req.body?.email)}`,
})

/**
 * Password spraying: one password tried against many accounts. The per-account
 * limiter never sees it, because every new e-mail lands in a fresh bucket.
 *
 * The budget is spent by failures only, so a shared address — CGNAT, an office,
 * a hotel lobby — is not throttled by its own legitimate sign-ins.
 */
export const loginIpLimiter = createLimiter({
  windowMs: 15 * MINUTES,
  limit: 50,
  skipSuccessfulRequests: true,
})

/** Mass account creation. Registering is rare, and bcrypt cost 12 is expensive. */
export const registerLimiter = createLimiter({
  windowMs: HOURS,
  limit: 10,
})

/**
 * Keyed by account rather than by address: the route already requires a
 * session, and an office behind one IP should not share a budget.
 *
 * The IP fallback only matters if this ever runs before `requireAuth` — without
 * it every request would key on `undefined` and collapse into one shared
 * bucket, turning a per-user limit into a global outage.
 */
export const uploadLimiter = createLimiter({
  windowMs: 10 * MINUTES,
  limit: 30,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
})

/**
 * Clears every limiter's counters. Test infrastructure only.
 *
 * The limiters above are module singletons, so without this the suite would
 * carry hits from one case into the next and the order of tests would decide
 * their result. Never called from production code, and deliberately not
 * reachable over HTTP.
 */
export async function resetRateLimitersForTests(): Promise<void> {
  await Promise.all(stores.map((store) => store.resetAll()))
}
