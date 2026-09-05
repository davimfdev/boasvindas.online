import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// Postgres is the one system boundary these tests mock: every route is exercised
// for real, but no socket is opened and no database is touched.
const { setRows, setRowsPerQuery, setFailure, dbMock, setDatabaseUp, clientMock, lastInsert } = vi.hoisted(() => {
  let rows: unknown[] = []
  let queue: unknown[][] = []
  let failure: Error | null = null
  let databaseUp = true
  // What the route handed to insert().values(): the only way to assert on the
  // value actually written, since the mock ignores the query itself.
  const inserted: Record<string, unknown>[] = []

  const nextRows = () => (queue.length > 0 ? queue.shift()! : rows)

  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      failure
        ? Promise.reject(failure).then(resolve, reject)
        : Promise.resolve(nextRows()).then(resolve, reject),
  }
  for (const method of ['from', 'where', 'limit', 'orderBy', 'returning', 'set', 'for']) {
    chain[method] = () => chain
  }
  chain.values = (value: Record<string, unknown>) => { inserted.push(value); return chain }
  const entry = () => chain
  const dbEntry = { select: entry, insert: entry, update: entry, delete: entry }

  // Stands in for the `postgres` tagged-template client: readiness calls it as
  // `client\`select 1\``, so the mock must be callable, not just an object.
  const clientMock = Object.assign(
    async (_strings: TemplateStringsArray, ..._values: unknown[]) => {
      if (!databaseUp) throw new Error('connection to app-postgres failed: password authentication')
      return [{ '?column?': 1 }]
    },
    { end: async () => {} },
  )

  return {
    /** Same rows for every query the route runs. */
    setRows: (next: unknown[]) => { rows = next; queue = []; failure = null },
    /** One entry per query, in the order the route runs them. */
    setRowsPerQuery: (next: unknown[][]) => { rows = []; queue = [...next]; failure = null },
    setFailure: (error: Error) => { failure = error },
    /** The most recent row handed to insert().values(). */
    lastInsert: () => inserted.at(-1),
    /** Controls what the tagged-template client mock does for `select 1`. */
    setDatabaseUp: (next: boolean) => { databaseUp = next },
    dbMock: {
      select: entry, insert: entry, update: entry, delete: entry,
      // The routes run inside a transaction; the queue is shared, so the
      // callback simply receives the same chain the pool would hand out.
      transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(dbEntry),
    },
    clientMock,
  }
})

vi.mock('../../db/index.js', () => ({ db: dbMock, client: clientMock }))

const { createApp } = await import('../../app.js')
const { hashPassword } = await import('../../services/password.js')
const { signSessionToken } = await import('../../services/session.js')
const { config } = await import('../../config.js')
const { resetRateLimitersForTests } = await import('../../middleware/rate-limit.js')

const app = createApp()

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'host@example.com', name: 'Host' }

async function sessionCookie(): Promise<string> {
  return `${config.sessionCookieName}=${await signSessionToken(USER)}`
}

beforeEach(async () => {
  setRows([])
  setDatabaseUp(true)
  // The limiters are module singletons: without this, hits from one case would
  // count against the next and the order of tests would decide their result.
  await resetRateLimitersForTests()
})

describe('health', () => {
  it('answers the container probe at /health', async () => {
    const res = await request(app).get('/health')
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('answers behind the reverse proxy at /api/health', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
  })

  it('answers 200 with database ok at /health/ready when the database responds', async () => {
    const res = await request(app).get('/health/ready')
    expect(res.body).toEqual({ status: 'ok', database: 'ok' })
  })

  it('answers 503 with database unreachable at /health/ready when the database fails', async () => {
    setDatabaseUp(false)
    const res = await request(app).get('/health/ready')
    expect(res.status).toBe(503)
  })

  it('reports degraded status in the body when the database fails', async () => {
    setDatabaseUp(false)
    const res = await request(app).get('/health/ready')
    expect(res.body).toEqual({ status: 'degraded', database: 'unreachable' })
  })

  it('never leaks the underlying driver error in the readiness response body', async () => {
    setDatabaseUp(false)
    const res = await request(app).get('/health/ready')
    expect(JSON.stringify(res.body)).not.toContain('app-postgres')
  })

  it('answers the readiness probe behind the reverse proxy at /api/health/ready', async () => {
    const res = await request(app).get('/api/health/ready')
    expect(res.body).toEqual({ status: 'ok', database: 'ok' })
  })
})

describe('error envelope', () => {
  it('returns 404 NOT_FOUND for an unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist')
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND' } })
  })

  it('returns 500 INTERNAL without leaking the underlying error', async () => {
    setFailure(new Error('connection to app-postgres failed: password authentication'))
    const res = await request(app)
      .get('/api/public/pages/qualquer')
    expect(res.body).toEqual({ error: { code: 'INTERNAL' } })
  })
})

describe('auth', () => {
  it('reports no session when the cookie is absent', async () => {
    const res = await request(app).get('/api/auth/session')
    expect(res.body).toEqual({ user: null })
  })

  it('reports the signed-in user when the cookie is valid', async () => {
    const res = await request(app).get('/api/auth/session').set('Cookie', await sessionCookie())
    expect(res.body.user).toEqual(USER)
  })

  it('ignores a session cookie signed with another secret', async () => {
    const res = await request(app)
      .get('/api/auth/session')
      .set('Cookie', `${config.sessionCookieName}=not.a.valid.jwt`)
    expect(res.body).toEqual({ user: null })
  })

  it('rejects a malformed register payload with 400 VALIDATION', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x', email: 'nao-e-email', password: '123' })
    expect(res.status).toBe(400)
  })

  it('answers 409 EMAIL_EXISTS when the email is taken', async () => {
    setRows([{ id: USER.id }])
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Host', email: USER.email, password: 'senha-bem-longa' })
    expect(res.body.error.code).toBe('EMAIL_EXISTS')
  })

  it('answers 401 CREDENTIALS for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@example.com', password: 'seja-o-que-for' })
    expect(res.status).toBe(401)
  })

  it('gives the same CREDENTIALS code for a wrong password as for an unknown email', async () => {
    setRows([{ ...USER, passwordHash: await hashPassword('senha-correta') }])
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER.email, password: 'senha-errada' })
    expect(res.body.error.code).toBe('CREDENTIALS')
  })

  it('returns the user on a successful login', async () => {
    setRows([{ ...USER, passwordHash: await hashPassword('senha-correta') }])
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER.email, password: 'senha-correta' })
    expect(res.body.user).toEqual(USER)
  })

  it('sets the session cookie as httpOnly with SameSite=Lax', async () => {
    setRows([{ ...USER, passwordHash: await hashPassword('senha-correta') }])
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER.email, password: 'senha-correta' })
    expect(res.headers['set-cookie'][0]).toMatch(/bv_session=.+; Max-Age=\d+; Path=\/; .*HttpOnly; SameSite=Lax/)
  })

  it('never puts the password hash in the login response', async () => {
    setRows([{ ...USER, passwordHash: await hashPassword('senha-correta') }])
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER.email, password: 'senha-correta' })
    expect(JSON.stringify(res.body)).not.toContain('$2')
  })

  it('expires the cookie on logout', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970')
  })

  it('answers 204 on logout', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(204)
  })
})

describe('pages (protected)', () => {
  it('rejects an anonymous list with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/pages')
    expect(res.body).toEqual({ error: { code: 'UNAUTHORIZED' } })
  })

  it('rejects an anonymous delete with 401', async () => {
    const res = await request(app).delete(`/api/pages/${USER.id}`)
    expect(res.status).toBe(401)
  })

  it('lists the pages of the signed-in user', async () => {
    setRows([{ id: 'page-1', slug: 'minha-suite', title: 'Minha Suíte' }])
    const res = await request(app).get('/api/pages').set('Cookie', await sessionCookie())
    expect(res.body.pages).toHaveLength(1)
  })

  it('answers 404 for a page the user does not own', async () => {
    setRows([])
    const res = await request(app).get('/api/pages/page-1').set('Cookie', await sessionCookie())
    expect(res.status).toBe(404)
  })

  it('refuses a reserved slug with 422 SLUG_RESERVED', async () => {
    const res = await request(app)
      .post('/api/pages')
      .set('Cookie', await sessionCookie())
      .send({ title: 'Painel', slug: 'app', theme: 'modern' })
    expect(res.body.error.code).toBe('SLUG_RESERVED')
  })

  it('refuses an invalid slug with 422 SLUG_INVALID', async () => {
    const res = await request(app)
      .post('/api/pages')
      .set('Cookie', await sessionCookie())
      .send({ title: 'Minha Suíte', slug: 'Slug Com Espaço', theme: 'modern' })
    expect(res.body.error.code).toBe('SLUG_INVALID')
  })

  it('creates a page and echoes it back', async () => {
    // 1: slug availability lookup (free), 2: insert ... returning.
    setRowsPerQuery([[], [{ id: 'page-1', slug: 'minha-suite', title: 'Minha Suíte', status: 'draft' }]])
    const res = await request(app)
      .post('/api/pages')
      .set('Cookie', await sessionCookie())
      .send({ title: 'Minha Suíte', theme: 'modern' })
    expect(res.status).toBe(201)
  })

  it('saves an update to an owned page', async () => {
    const page = { id: 'page-1', slug: 'minha-suite', title: 'Minha Suíte' }
    setRowsPerQuery([[page], [{ ...page, subtitle: 'Vista para o mar' }]])
    const res = await request(app)
      .put('/api/pages/page-1')
      .set('Cookie', await sessionCookie())
      .send({ subtitle: 'Vista para o mar' })
    expect(res.body.page.subtitle).toBe('Vista para o mar')
  })

  // End-to-end guard for the bug that made every upload look like it worked and
  // then vanish: the builder autosaves the relative URL the upload returned.
  it('saves page content that references an uploaded image', async () => {
    const content = {
      nav: 'buttons',
      sections: [{ id: 's1', title: 'Início', icon: 'Home', blocks: [
        { id: 'b1', type: 'image', props: { url: '/api/media/33333333-3333-4333-8333-333333333333', alt: '' } },
      ] }],
    }
    const page = { id: 'page-1', slug: 'minha-suite', title: 'Minha Suíte' }
    setRowsPerQuery([[page], [{ ...page, content }]])
    const res = await request(app)
      .put('/api/pages/page-1')
      .set('Cookie', await sessionCookie())
      .send({ content })
    expect(res.status).toBe(200)
  })

  it('rejects page content with an arbitrary relative image path', async () => {
    setRowsPerQuery([[{ id: 'page-1', slug: 'minha-suite', title: 'Minha Suíte' }]])
    const res = await request(app)
      .put('/api/pages/page-1')
      .set('Cookie', await sessionCookie())
      .send({ content: { nav: 'buttons', sections: [
        { id: 's1', title: 'Início', icon: 'Home', blocks: [
          { id: 'b1', type: 'image', props: { url: '/foo/bar', alt: '' } },
        ] },
      ] } })
    expect(res.body.error.code).toBe('VALIDATION')
  })

  it('toggles a draft to published', async () => {
    const page = { id: 'page-1', slug: 'minha-suite', title: 'Minha Suíte', status: 'draft' }
    setRowsPerQuery([[page], [{ ...page, status: 'published' }]])
    const res = await request(app)
      .post('/api/pages/page-1/publish')
      .set('Cookie', await sessionCookie())
    expect(res.body.page.status).toBe('published')
  })

  it('answers 204 when an owned page is deleted', async () => {
    setRowsPerQuery([[{ id: USER.id }], [{ id: 'page-1' }], [], []])
    const res = await request(app).delete('/api/pages/page-1').set('Cookie', await sessionCookie())
    expect(res.status).toBe(204)
  })

  it('rejects a create without a title with 400 VALIDATION', async () => {
    const res = await request(app)
      .post('/api/pages')
      .set('Cookie', await sessionCookie())
      .send({ theme: 'modern' })
    expect(res.body.error.code).toBe('VALIDATION')
  })
})

describe('public page', () => {
  it('answers 404 for an unknown slug', async () => {
    setRows([])
    const res = await request(app).get('/api/public/pages/nao-existe')
    expect(res.status).toBe(404)
  })

  it('withholds the content of a page that is still a draft', async () => {
    setRows([
      { slug: 'rascunho', title: 'Rascunho', theme: 'modern', status: 'draft', content: { secret: true } },
    ])
    const res = await request(app).get('/api/public/pages/rascunho')
    expect(res.body.page.content).toBeUndefined()
  })

  it('serves a published page without requiring a session', async () => {
    setRows([
      { slug: 'minha-suite', title: 'Minha Suíte', theme: 'modern', status: 'published', content: null },
    ])
    const res = await request(app).get('/api/public/pages/minha-suite')
    expect(res.body.page.slug).toBe('minha-suite')
  })
})

describe('identidade canônica de e-mail', () => {
  const STORED = 'host@example.com'

  async function register(email: string) {
    return request(app)
      .post('/api/auth/register')
      .send({ name: 'Host', email, password: 'senha-bem-longa' })
  }

  async function login(email: string, password = 'senha-correta') {
    setRows([{ ...USER, passwordHash: await hashPassword('senha-correta') }])
    return request(app).post('/api/auth/login').send({ email, password })
  }

  it('grava o e-mail em minúsculas', async () => {
    setRowsPerQuery([[], [{ id: USER.id, email: STORED }]])
    await register('HOST@Example.COM')
    expect(lastInsert()?.email).toBe(STORED)
  })

  // Espaço colado num e-mail válido não pode reprovar o cadastro.
  it('grava o e-mail sem os espaços em volta', async () => {
    setRowsPerQuery([[], [{ id: USER.id, email: STORED }]])
    await register('  host@example.com  ')
    expect(lastInsert()?.email).toBe(STORED)
  })

  it('aceita um e-mail que só era inválido por causa dos espaços', async () => {
    setRowsPerQuery([[], [{ id: USER.id, email: STORED }]])
    const res = await register('  host@example.com  ')
    expect(res.status).toBe(201)
  })

  it('trata uma variante de caixa como a mesma conta já existente', async () => {
    setRows([{ id: USER.id }])
    const res = await register('HOST@EXAMPLE.COM')
    expect(res.body.error.code).toBe('EMAIL_EXISTS')
  })

  it('trata uma variante com espaços como a mesma conta já existente', async () => {
    setRows([{ id: USER.id }])
    const res = await register('  Host@Example.Com  ')
    expect(res.body.error.code).toBe('EMAIL_EXISTS')
  })

  it('autentica a conta gravada em minúsculas a partir de um e-mail em maiúsculas', async () => {
    const res = await login('HOST@EXAMPLE.COM')
    expect(res.body.user).toEqual(USER)
  })

  it('autentica ignorando os espaços em volta', async () => {
    const res = await login('  Host@Example.Com  ')
    expect(res.body.user).toEqual(USER)
  })

  // A proteção de tempo constante contra enumeração continua de pé.
  it('segue devolvendo CREDENTIALS para um e-mail desconhecido', async () => {
    setRows([])
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'NINGUEM@Example.com', password: 'seja-o-que-for' })
    expect(res.body.error.code).toBe('CREDENTIALS')
  })

  it('continua recusando um e-mail que não é e-mail', async () => {
    const res = await register('  nao-e-email  ')
    expect(res.body.error.code).toBe('VALIDATION')
  })
})
