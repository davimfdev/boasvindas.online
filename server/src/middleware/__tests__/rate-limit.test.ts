import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// Postgres is mocked as in http.test.ts: every limiter and route runs for real,
// no socket is opened.
const { setRows, setRowsPerQuery, setPasswordValid, verifyPasswordStub, dbMock, clientMock } = vi.hoisted(() => {
  let rows: unknown[] = []
  let queue: unknown[][] = []

  const nextRows = () => (queue.length > 0 ? queue.shift()! : rows)

  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(nextRows()).then(resolve, reject),
  }
  for (const method of ['from', 'where', 'limit', 'orderBy', 'values', 'returning', 'set', 'innerJoin', 'for']) {
    chain[method] = () => chain
  }
  const entry = () => chain
  const dbEntry = { select: entry, insert: entry, update: entry, delete: entry }

  let passwordValid = false

  return {
    setRows: (next: unknown[]) => { rows = next; queue = [] },
    setRowsPerQuery: (next: unknown[][]) => { rows = []; queue = [...next] },
    setPasswordValid: (next: boolean) => { passwordValid = next },
    verifyPasswordStub: async () => passwordValid,
    dbMock: {
      select: entry, insert: entry, update: entry, delete: entry,
      // The routes run inside a transaction; the queue is shared, so the
      // callback simply receives the same chain the pool would hand out.
      transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(dbEntry),
    },
    clientMock: Object.assign(async () => [{ '?column?': 1 }], { end: async () => {} }),
  }
})

vi.mock('../../db/index.js', () => ({ db: dbMock, client: clientMock }))

// bcrypt cost 12 is ~250ms per call by design. These tests fire dozens of login
// and register attempts to reach a limit, so the hashing is stubbed to keep the
// suite fast; what is under test is the limiter, not the password service. The
// verdict is settable because whether a login succeeds decides whether it spends
// the limiter's budget.
vi.mock('../../services/password.js', () => ({
  hashPassword: async () => '$2a$12$stub',
  verifyPassword: verifyPasswordStub,
}))

process.env.MEDIA_MAX_BYTES = '4096'

const { createApp } = await import('../../app.js')
const { signSessionToken } = await import('../../services/session.js')
const { config } = await import('../../config.js')
const { resetRateLimitersForTests } = await import('../rate-limit.js')

const app = createApp()

const HOST = { id: '11111111-1111-4111-8111-111111111111', email: 'host@example.com', name: 'Host' }
const OTHER_HOST = { id: '44444444-4444-4444-8444-444444444444', email: 'outro@example.com', name: 'Outro' }
const PAGE_ID = '22222222-2222-4222-8222-222222222222'

/** Mirrors the limits configured in rate-limit.ts. */
const LOGIN_ACCOUNT_LIMIT = 10
const LOGIN_IP_LIMIT = 50
const REGISTER_LIMIT = 10
const UPLOAD_LIMIT = 30

async function cookieFor(user: typeof HOST): Promise<string> {
  return `${config.sessionCookieName}=${await signSessionToken(user)}`
}

function login(email: string) {
  return request(app).post('/api/auth/login').send({ email, password: 'senha-errada' })
}

/** A login that answers 200: the account exists and the password checks out. */
function loginSuccessfully(email: string) {
  setRows([{ id: HOST.id, email, name: HOST.name, passwordHash: '$2a$12$stub' }])
  setPasswordValid(true)
  return request(app).post('/api/auth/login').send({ email, password: 'senha-certa' })
}

/** One upload attempt without a file: cheap, and still counted by the limiter. */
function upload(cookie: string) {
  return request(app).post('/api/media/upload').set('Cookie', cookie).field('pageId', PAGE_ID)
}

async function exhaustUploads(cookie: string) {
  for (let i = 0; i < UPLOAD_LIMIT; i++) await upload(cookie)
}

beforeEach(async () => {
  setRows([])
  setPasswordValid(false)
  await resetRateLimitersForTests()
})

describe('login rate limit', () => {
  it('leaves the route behaving normally below the limit', async () => {
    const res = await login('host@example.com')
    expect(res.body.error.code).toBe('CREDENTIALS')
  })

  it('still answers 401 on the last attempt before the limit', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT - 1; i++) await login('host@example.com')
    const res = await login('host@example.com')
    expect(res.status).toBe(401)
  })

  it('answers 429 once the attempts for one account exceed the limit', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT; i++) await login('host@example.com')
    const res = await login('host@example.com')
    expect(res.status).toBe(429)
  })

  it('returns the RATE_LIMITED envelope when the account limit is hit', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT; i++) await login('host@example.com')
    const res = await login('host@example.com')
    expect(res.body).toEqual({
      error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em alguns minutos.' },
    })
  })

  it('counts casing and padding variants into the same bucket', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT; i++) await login('host@example.com')
    const res = await login('  HOST@Example.COM  ')
    expect(res.status).toBe(429)
  })

  it('gives an unknown account the same envelope as a known one', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT; i++) await login('ninguem@example.com')
    const res = await login('ninguem@example.com')
    expect(res.body).toEqual({
      error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em alguns minutos.' },
    })
  })

  it('limits by address too, so rotating the e-mail does not buy more attempts', async () => {
    for (let i = 0; i < LOGIN_IP_LIMIT; i++) await login(`alvo-${i}@example.com`)
    const res = await login('mais-um@example.com')
    expect(res.status).toBe(429)
  })

  it('returns the RATE_LIMITED envelope when the address limit is hit', async () => {
    for (let i = 0; i < LOGIN_IP_LIMIT; i++) await login(`alvo-${i}@example.com`)
    const res = await login('mais-um@example.com')
    expect(res.body).toEqual({
      error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em alguns minutos.' },
    })
  })

  // A shared address (CGNAT, an office) must not throttle itself by signing in.
  it('does not spend the address budget on successful logins', async () => {
    for (let i = 0; i < LOGIN_IP_LIMIT; i++) await loginSuccessfully('host@example.com')
    setRows([])
    setPasswordValid(false)
    const res = await login('host@example.com')
    expect(res.status).toBe(401)
  })

  it('sends Retry-After when it refuses a request', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT; i++) await login('host@example.com')
    const res = await login('host@example.com')
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
  })
})

describe('register rate limit', () => {
  function register(email: string) {
    return request(app).post('/api/auth/register').send({ name: 'Anfitriao', email, password: 'test-password' })
  }

  it('answers 429 above the limit', async () => {
    for (let i = 0; i < REGISTER_LIMIT; i++) await register(`novo-${i}@example.com`)
    const res = await register('mais-um@example.com')
    expect(res.status).toBe(429)
  })

  it('returns the RATE_LIMITED code above the limit', async () => {
    for (let i = 0; i < REGISTER_LIMIT; i++) await register(`novo-${i}@example.com`)
    const res = await register('mais-um@example.com')
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })
})

describe('upload rate limit', () => {
  it('answers 429 above the limit for an authenticated host', async () => {
    const cookie = await cookieFor(HOST)
    await exhaustUploads(cookie)
    const res = await upload(cookie)
    expect(res.status).toBe(429)
  })

  it('returns the RATE_LIMITED code above the limit', async () => {
    const cookie = await cookieFor(HOST)
    await exhaustUploads(cookie)
    const res = await upload(cookie)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })

  it('keeps a second account on its own budget', async () => {
    await exhaustUploads(await cookieFor(HOST))
    setRowsPerQuery([[{ id: PAGE_ID }]])
    const res = await upload(await cookieFor(OTHER_HOST))
    expect(res.status).not.toBe(429)
  })

  // Proves the limiter runs ahead of multer: an oversized body would normally
  // come back as FILE_TOO_LARGE, and only reaches that check if it was read.
  it('refuses an oversized upload as rate-limited instead of reading the file', async () => {
    const cookie = await cookieFor(HOST)
    await exhaustUploads(cookie)
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', cookie)
      .field('pageId', PAGE_ID)
      .attach('file', Buffer.alloc(9000), 'grande.png')
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })

  it('rejects an anonymous upload as unauthorized, never as rate-limited', async () => {
    const res = await request(app).post('/api/media/upload').field('pageId', PAGE_ID)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })
})

describe('routes without a limiter', () => {
  it('keeps answering the health probe after login is exhausted', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT + 1; i++) await login('host@example.com')
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
  })

  it('keeps answering the session lookup after login is exhausted', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT + 1; i++) await login('host@example.com')
    const res = await request(app).get('/api/auth/session')
    expect(res.status).toBe(200)
  })
})

describe('resetRateLimitersForTests', () => {
  it('clears the counters so a limited client is served again', async () => {
    for (let i = 0; i < LOGIN_ACCOUNT_LIMIT + 1; i++) await login('host@example.com')
    await resetRateLimitersForTests()
    const res = await login('host@example.com')
    expect(res.status).toBe(401)
  })
})
