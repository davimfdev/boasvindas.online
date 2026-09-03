import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// Postgres is mocked exactly as in http.test.ts; the filesystem is the second
// boundary these tests stub, by pointing MEDIA_DIR at a throwaway directory.
const { setRows, setRowsPerQuery, dbMock, clientMock } = vi.hoisted(() => {
  let rows: unknown[] = []
  let queue: unknown[][] = []

  const nextRows = () => (queue.length > 0 ? queue.shift()! : rows)

  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(nextRows()).then(resolve, reject),
  }
  for (const method of ['from', 'where', 'limit', 'orderBy', 'values', 'returning', 'set', 'innerJoin']) {
    chain[method] = () => chain
  }
  const entry = () => chain

  return {
    setRows: (next: unknown[]) => { rows = next; queue = [] },
    setRowsPerQuery: (next: unknown[][]) => { rows = []; queue = [...next] },
    dbMock: { select: entry, insert: entry, update: entry, delete: entry },
    clientMock: Object.assign(async () => [{ '?column?': 1 }], { end: async () => {} }),
  }
})

vi.mock('../../db/index.js', () => ({ db: dbMock, client: clientMock }))

const MEDIA_DIR = mkdtempSync(path.join(os.tmpdir(), 'bv-media-'))
process.env.MEDIA_DIR = MEDIA_DIR
process.env.MEDIA_MAX_BYTES = '4096'

const { createApp } = await import('../../app.js')
const { saveMedia } = await import('../../services/media-storage.js')
const { signSessionToken } = await import('../../services/session.js')
const { config } = await import('../../config.js')
const { resetRateLimitersForTests } = await import('../../middleware/rate-limit.js')

const app = createApp()

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'host@example.com', name: 'Host' }
const PAGE_ID = '22222222-2222-4222-8222-222222222222'
const MEDIA_ID = '33333333-3333-4333-8333-333333333333'

const sharp = (await import('sharp')).default

/**
 * A real, decodable image: the upload pipeline re-encodes what it receives, so
 * a hand-written magic-byte stub is now (correctly) rejected as unprocessable.
 * 500px wide yields two variants, 400 and 500, which is what exercises srcset.
 */
const PHOTO = await sharp({
  create: { width: 500, height: 300, channels: 3, background: { r: 200, g: 120, b: 40 } },
})
  .png()
  .toBuffer()

/** Matches whatever the pipeline writes: a generated id, always WebP. */
const STORED_NAME = /^[0-9a-f-]{36}\.webp$/

/** Opaque bytes for the tests that exercise serving, not processing. */
const STORED_BYTES = Buffer.from('bytes de um objeto ja armazenado')

async function sessionCookie(): Promise<string> {
  return `${config.sessionCookieName}=${await signSessionToken(USER)}`
}

/** Queues the owned-page lookup and the insert ... returning the upload runs. */
function ownedPageThenInsert() {
  setRowsPerQuery([[{ id: PAGE_ID }], [{ id: MEDIA_ID }]])
}

beforeEach(async () => {
  setRows([])
  // See http.test.ts: the rate limiters keep state across cases otherwise.
  await resetRateLimitersForTests()
})

afterAll(() => {
  rmSync(MEDIA_DIR, { recursive: true, force: true })
})

describe('POST /api/media/upload', () => {
  it('answers 201 for an image on a page the user owns', async () => {
    ownedPageThenInsert()
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .field('pageId', PAGE_ID)
      .attach('file', PHOTO, 'foto.png')
    expect(res.status).toBe(201)
  })

  it('returns the servable URL of the stored image', async () => {
    ownedPageThenInsert()
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .field('pageId', PAGE_ID)
      .attach('file', PHOTO, 'foto.png')
    expect(res.body.media.url).toBe(`/api/media/${MEDIA_ID}`)
  })

  it('names the stored file after a generated id, never after the client filename', async () => {
    ownedPageThenInsert()
    const before = readdirSync(MEDIA_DIR)
    await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .field('pageId', PAGE_ID)
      .attach('file', PHOTO, '../../evil.png')
    const added = readdirSync(MEDIA_DIR).filter((name) => !before.includes(name))
    expect(added.every((name) => STORED_NAME.test(name))).toBe(true)
  })

  it('re-encodes the upload to WebP whatever was sent', async () => {
    ownedPageThenInsert()
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .field('pageId', PAGE_ID)
      .attach('file', PHOTO, 'foto.png')
    expect(res.body.media.mimeType).toBe('image/webp')
  })

  it('reports the widths the browser can request through srcset', async () => {
    ownedPageThenInsert()
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .field('pageId', PAGE_ID)
      .attach('file', PHOTO, 'foto.png')
    expect(res.body.media.widths).toEqual([400, 500])
  })

  it('answers 415 when the bytes are not an accepted image', async () => {
    setRows([{ id: PAGE_ID }])
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .field('pageId', PAGE_ID)
      .attach('file', Buffer.from('<?php echo 1; ?>'), 'shell.png')
    expect(res.status).toBe(415)
  })

  it('answers 413 when the file is larger than the configured limit', async () => {
    setRows([{ id: PAGE_ID }])
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .field('pageId', PAGE_ID)
      .attach('file', Buffer.alloc(8192, 1), 'grande.png')
    expect(res.status).toBe(413)
  })

  it('answers 401 UNAUTHORIZED without a session', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .field('pageId', PAGE_ID)
      .attach('file', PHOTO, 'foto.png')
    expect(res.body).toEqual({ error: { code: 'UNAUTHORIZED' } })
  })

  it('answers 404 for a page the user does not own', async () => {
    setRows([])
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .field('pageId', PAGE_ID)
      .attach('file', PHOTO, 'foto.png')
    expect(res.status).toBe(404)
  })

  it('answers 400 VALIDATION when no pageId is sent', async () => {
    const res = await request(app)
      .post('/api/media/upload')
      .set('Cookie', await sessionCookie())
      .attach('file', PHOTO, 'foto.png')
    expect(res.body.error.code).toBe('VALIDATION')
  })
})

describe('GET /api/media/:id', () => {
  it('serves the stored bytes without a session', async () => {
    const filename = await saveMedia(STORED_BYTES, 'webp')
    setRows([{ filename, mimeType: 'image/png' }])
    const res = await request(app).get(`/api/media/${MEDIA_ID}`)
    expect(res.body.equals(STORED_BYTES)).toBe(true)
  })

  it('serves the recorded content type', async () => {
    const filename = await saveMedia(STORED_BYTES, 'webp')
    setRows([{ filename, mimeType: 'image/png' }])
    const res = await request(app).get(`/api/media/${MEDIA_ID}`)
    expect(res.headers['content-type']).toBe('image/png')
  })

  it('marks the response as immutable so proxies cache it', async () => {
    const filename = await saveMedia(STORED_BYTES, 'webp')
    setRows([{ filename, mimeType: 'image/png' }])
    const res = await request(app).get(`/api/media/${MEDIA_ID}`)
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable')
  })

  it('answers 404 for an unknown id', async () => {
    setRows([])
    const res = await request(app).get(`/api/media/${MEDIA_ID}`)
    expect(res.status).toBe(404)
  })

  it('answers 404 when the row survives but the file is gone', async () => {
    setRows([{ filename: '44444444-4444-4444-4444-444444444444.png', mimeType: 'image/png' }])
    const res = await request(app).get(`/api/media/${MEDIA_ID}`)
    expect(res.status).toBe(404)
  })
})

describe('GET /api/media/:id?w=', () => {
  /** Two stored objects of clearly different sizes, as the pipeline produces. */
  async function rowWithVariants() {
    const small = await saveMedia(Buffer.alloc(100, 1), 'webp')
    const large = await saveMedia(Buffer.alloc(900, 2), 'webp')
    return {
      filename: large,
      mimeType: 'image/webp',
      variants: [
        { width: 400, file: small, sizeBytes: 100 },
        { width: 1600, file: large, sizeBytes: 900 },
      ],
    }
  }

  it('serves the narrow variant when the browser asks for it', async () => {
    setRows([await rowWithVariants()])
    const res = await request(app).get(`/api/media/${MEDIA_ID}?w=400`)
    expect(res.body.length).toBe(100)
  })

  it('serves the widest variant when no width is requested', async () => {
    setRows([await rowWithVariants()])
    const res = await request(app).get(`/api/media/${MEDIA_ID}`)
    expect(res.body.length).toBe(900)
  })

  it('falls back to the widest stored variant when asked for more than exists', async () => {
    setRows([await rowWithVariants()])
    const res = await request(app).get(`/api/media/${MEDIA_ID}?w=4000`)
    expect(res.body.length).toBe(900)
  })

  it('never resizes on demand: an unknown width returns a stored object', async () => {
    setRows([await rowWithVariants()])
    const res = await request(app).get(`/api/media/${MEDIA_ID}?w=613`)
    expect(res.body.length).toBe(900)
  })

  it('ignores a non-numeric width instead of failing', async () => {
    setRows([await rowWithVariants()])
    const res = await request(app).get(`/api/media/${MEDIA_ID}?w=../../etc/passwd`)
    expect(res.status).toBe(200)
  })

  it('serves rows written before the pipeline existed, which have no variants', async () => {
    const filename = await saveMedia(STORED_BYTES, 'webp')
    setRows([{ filename, mimeType: 'image/webp', variants: null }])
    const res = await request(app).get(`/api/media/${MEDIA_ID}?w=400`)
    expect(res.body.equals(STORED_BYTES)).toBe(true)
  })
})

describe('DELETE /api/media/:id', () => {
  it('answers 204 for the owner', async () => {
    const filename = await saveMedia(STORED_BYTES, 'webp')
    setRowsPerQuery([[{ filename }], []])
    const res = await request(app)
      .delete(`/api/media/${MEDIA_ID}`)
      .set('Cookie', await sessionCookie())
    expect(res.status).toBe(204)
  })

  it('removes the file from storage', async () => {
    const filename = await saveMedia(STORED_BYTES, 'webp')
    setRowsPerQuery([[{ filename }], []])
    await request(app).delete(`/api/media/${MEDIA_ID}`).set('Cookie', await sessionCookie())
    expect(readdirSync(MEDIA_DIR)).not.toContain(filename)
  })

  it('answers 404 for someone who does not own the page', async () => {
    setRows([])
    const res = await request(app)
      .delete(`/api/media/${MEDIA_ID}`)
      .set('Cookie', await sessionCookie())
    expect(res.status).toBe(404)
  })

  it('answers 401 UNAUTHORIZED without a session', async () => {
    const res = await request(app).delete(`/api/media/${MEDIA_ID}`)
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/pages/:id removes the media files of the page', () => {
  /** A row as the upload pipeline writes it: one object per width, and filename repeating the widest. */
  async function storedMediaRow() {
    const small = await saveMedia(Buffer.alloc(100, 1), 'webp')
    const large = await saveMedia(Buffer.alloc(900, 2), 'webp')
    return {
      filename: large,
      variants: [
        { width: 400, file: small, sizeBytes: 100 },
        { width: 1600, file: large, sizeBytes: 900 },
      ],
    }
  }

  /** The three queries the route runs: owned page, its media rows, the delete. */
  function ownedPageWith(rows: unknown[]) {
    setRowsPerQuery([[{ id: PAGE_ID, userId: USER.id }], rows, []])
  }

  async function deletePage() {
    return request(app).delete(`/api/pages/${PAGE_ID}`).set('Cookie', await sessionCookie())
  }

  it('answers 204 for the owner', async () => {
    ownedPageWith([await storedMediaRow()])
    const res = await deletePage()
    expect(res.status).toBe(204)
  })

  it('removes the widest stored file', async () => {
    const row = await storedMediaRow()
    ownedPageWith([row])
    await deletePage()
    expect(readdirSync(MEDIA_DIR)).not.toContain(row.filename)
  })

  // filename alone would leave every narrower width on disk.
  it('removes the narrow variant as well, not only filename', async () => {
    const row = await storedMediaRow()
    ownedPageWith([row])
    await deletePage()
    expect(readdirSync(MEDIA_DIR)).not.toContain(row.variants[0].file)
  })

  // The lookup is scoped by pageId, so a file the query never returned must survive.
  it('leaves a file belonging to another page untouched', async () => {
    const other = await saveMedia(STORED_BYTES, 'webp')
    ownedPageWith([await storedMediaRow()])
    await deletePage()
    expect(readdirSync(MEDIA_DIR)).toContain(other)
  })

  it('answers 404 for a page the user does not own', async () => {
    setRows([])
    const res = await deletePage()
    expect(res.status).toBe(404)
  })

  it('removes nothing when the page is not owned', async () => {
    const untouched = await saveMedia(STORED_BYTES, 'webp')
    setRows([])
    await deletePage()
    expect(readdirSync(MEDIA_DIR)).toContain(untouched)
  })

  it('removes the filename of a legacy row written before variants existed', async () => {
    const filename = await saveMedia(STORED_BYTES, 'webp')
    ownedPageWith([{ filename, variants: null }])
    await deletePage()
    expect(readdirSync(MEDIA_DIR)).not.toContain(filename)
  })

  it('answers 204 for a page that has no media at all', async () => {
    ownedPageWith([])
    const res = await deletePage()
    expect(res.status).toBe(204)
  })

  // Cleanup is best effort: a file already gone must not fail the request.
  it('answers 204 when a stored file is already missing', async () => {
    const row = await storedMediaRow()
    rmSync(path.join(MEDIA_DIR, row.filename))
    ownedPageWith([row])
    const res = await deletePage()
    expect(res.status).toBe(204)
  })
})
