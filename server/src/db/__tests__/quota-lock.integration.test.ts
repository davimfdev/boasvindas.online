/**
 * The parts of BLK-3B a mocked database cannot judge: whether the usage query
 * really scopes by user, and whether the shared user-row lock really serializes.
 * Both are properties of PostgreSQL, so both are asserted against a real one.
 *
 * Runs only when TEST_DATABASE_URL is set, and deliberately never falls back to
 * DATABASE_URL: this suite writes and deletes rows, and must not be able to
 * reach the database the API serves. Point it at a throwaway database and run
 * the usual `npm test`.
 */

import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { media, pages, users } from '../schema.js'
import { usedBytesForUser } from '../../services/media-quota.js'

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
const describeIntegration = TEST_DATABASE_URL ? describe : describe.skip

const MIGRATIONS = path.resolve(fileURLToPath(new URL('../../../migrations', import.meta.url)))

const LOCK_USER = 'SELECT id FROM users WHERE id = $1 FOR UPDATE'
const LOCK_USER_NOWAIT = LOCK_USER + ' NOWAIT'
/** PostgreSQL lock_not_available: someone else holds the row right now. */
const LOCK_NOT_AVAILABLE = '55P03'

describeIntegration('BLK-3B against a real PostgreSQL', () => {
  const client = postgres(TEST_DATABASE_URL as string, { max: 4 })
  const db = drizzle(client, { schema: { media, pages, users } })

  // One connection each, so a statement issued on one is never served by a
  // different pooled socket and the transactions stay genuinely separate.
  const holder = postgres(TEST_DATABASE_URL as string, { max: 1 })
  const rival = postgres(TEST_DATABASE_URL as string, { max: 1 })
  const observer = postgres(TEST_DATABASE_URL as string, { max: 1 })

  const userA = randomUUID()
  const userB = randomUUID()
  const pageA1 = randomUUID()
  const pageA2 = randomUUID()
  const pageB1 = randomUUID()

  const variant = (width: number, sizeBytes: number) => ({
    width,
    file: randomUUID() + '.webp',
    sizeBytes,
  })

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: MIGRATIONS })

    await db.insert(users).values([
      { id: userA, email: 'a-' + userA + '@example.com', name: 'Anfitriao A', passwordHash: 'x' },
      { id: userB, email: 'b-' + userB + '@example.com', name: 'Anfitriao B', passwordHash: 'x' },
    ])
    await db.insert(pages).values([
      { id: pageA1, userId: userA, slug: 'a1-' + pageA1, title: 'A1' },
      { id: pageA2, userId: userA, slug: 'a2-' + pageA2, title: 'A2', status: 'published' },
      { id: pageB1, userId: userB, slug: 'b1-' + pageB1, title: 'B1' },
    ])
    await db.insert(media).values([
      // Page 1 of A: two widths, so only summing variants gets the total right.
      { pageId: pageA1, filename: 'a1.webp', mimeType: 'image/webp', sizeBytes: 900,
        variants: [variant(400, 100), variant(1600, 900)] },
      // Page 2 of A is published, and has to count exactly like the draft.
      { pageId: pageA2, filename: 'a2.webp', mimeType: 'image/webp', sizeBytes: 700,
        variants: [variant(800, 700)] },
      // A legacy row of A: no variants, so sizeBytes is the whole of it.
      { pageId: pageA2, filename: 'a3.webp', mimeType: 'image/webp', sizeBytes: 512, variants: null },
      // B's media must never reach A's total.
      { pageId: pageB1, filename: 'b1.webp', mimeType: 'image/webp', sizeBytes: 5000,
        variants: [variant(1600, 5000)] },
    ])
  })

  afterAll(async () => {
    // Pages and media go with the users through the cascade.
    await db.delete(users).where(eq(users.id, userA))
    await db.delete(users).where(eq(users.id, userB))
    await Promise.all([client.end(), holder.end(), rival.end(), observer.end()])
  })

  describe('usage is scoped to the account', () => {
    it('counts every variant of every page the user owns', async () => {
      // 100 + 900 (page A1) + 700 (page A2) + 512 (legacy row) = 2212
      expect(await usedBytesForUser(db, userA)).toBe(2212)
    })

    it('does not count media belonging to another account', async () => {
      expect(await usedBytesForUser(db, userB)).toBe(5000)
    })

    it('is zero for an account that owns no media', async () => {
      const stranger = randomUUID()
      await db.insert(users).values({
        id: stranger, email: 'c-' + stranger + '@example.com', name: 'C', passwordHash: 'x',
      })
      const used = await usedBytesForUser(db, stranger)
      await db.delete(users).where(eq(users.id, stranger))
      expect(used).toBe(0)
    })
  })

  describe('the shared user-row lock', () => {
    it('refuses a second holder while the first still has the row', async () => {
      await holder.unsafe('BEGIN')
      await holder.unsafe(LOCK_USER, [userA])
      await rival.unsafe('BEGIN')

      const attempt = rival.unsafe(LOCK_USER_NOWAIT, [userA])
      await expect(attempt).rejects.toMatchObject({ code: LOCK_NOT_AVAILABLE })

      await rival.unsafe('ROLLBACK')
      await holder.unsafe('COMMIT')
    })

    it('hands the row over once the first holder commits', async () => {
      await holder.unsafe('BEGIN')
      await holder.unsafe(LOCK_USER, [userA])
      await holder.unsafe('COMMIT')

      await rival.unsafe('BEGIN')
      const rows = await rival.unsafe(LOCK_USER_NOWAIT, [userA])
      await rival.unsafe('COMMIT')

      expect(rows).toHaveLength(1)
    })

    // Proves it waits rather than merely failing: the rival is observed blocked
    // on the holder, and only then is the holder released.
    it('makes a same-user waiter block until the holder releases', async () => {
      const [pidRow] = await rival.unsafe('SELECT pg_backend_pid() AS pid')
      const rivalPid = Number(pidRow.pid)

      await holder.unsafe('BEGIN')
      await holder.unsafe(LOCK_USER, [userA])

      await rival.unsafe('BEGIN')
      let acquired = false
      const waiting = rival.unsafe(LOCK_USER, [userA]).then(() => { acquired = true })

      await waitUntilBlocked(rivalPid)
      const blockedBeforeRelease = acquired

      await holder.unsafe('COMMIT')
      await waiting
      await rival.unsafe('COMMIT')

      expect(blockedBeforeRelease).toBe(false)
    })

    it('lets a different account take its own row straight away', async () => {
      await holder.unsafe('BEGIN')
      await holder.unsafe(LOCK_USER, [userA])

      await rival.unsafe('BEGIN')
      const rows = await rival.unsafe(LOCK_USER_NOWAIT, [userB])
      await rival.unsafe('COMMIT')
      await holder.unsafe('COMMIT')

      expect(rows).toHaveLength(1)
    })
  })

  // The 404 path of DELETE /api/pages/:id returns early from the callback. What
  // that does to the transaction decides whether the early return is safe, so it
  // is pinned here rather than assumed.
  describe('what the transaction callback does on return', () => {
    it('commits the work when the callback returns normally', async () => {
      const id = randomUUID()
      await db.transaction(async (tx) => {
        await tx.insert(pages).values({ id, userId: userA, slug: 'commit-' + id, title: 'C' })
        return null
      })

      const rows = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, id))
      await db.delete(pages).where(eq(pages.id, id))
      expect(rows).toHaveLength(1)
    })

    it('rolls the work back when the callback throws', async () => {
      const id = randomUUID()
      const boom = new Error('desiste')
      await expect(
        db.transaction(async (tx) => {
          await tx.insert(pages).values({ id, userId: userA, slug: 'rollback-' + id, title: 'R' })
          throw boom
        }),
      ).rejects.toBe(boom)

      const rows = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, id))
      expect(rows).toHaveLength(0)
    })
  })

  // The canonical-email invariant lives in the database, not only in the zod
  // schema, so it is the database that has to be asked whether it holds.
  describe('canonical e-mail invariant', () => {
    const CANONICAL_VIOLATION = '23514'  // check_violation
    const UNIQUE_VIOLATION = '23505'

    async function insertRaw(email: string) {
      return client.unsafe(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)',
        [email, 'Bruto', 'x'],
      )
    }

    it('accepts a canonical address', async () => {
      const email = 'canon-' + randomUUID() + '@example.com'
      await expect(insertRaw(email)).resolves.toBeDefined()
      await db.delete(users).where(eq(users.email, email))
    })

    // Bypassing the application must not bypass the invariant.
    it('rejects an address with uppercase, even inserted raw', async () => {
      const email = 'Canon-' + randomUUID() + '@Example.com'
      await expect(insertRaw(email)).rejects.toMatchObject({ code: CANONICAL_VIOLATION })
    })

    it('rejects an address padded with ASCII spaces', async () => {
      const email = '  canon-' + randomUUID() + '@example.com  '
      await expect(insertRaw(email)).rejects.toMatchObject({ code: CANONICAL_VIOLATION })
    })

    // btrim() with one argument strips only the ASCII space, so these four
    // are exactly the cases a naive constraint would have let through.
    it('rejects an address padded with a tab', async () => {
      const email = '\tcanon-' + randomUUID() + '@example.com\t'
      await expect(insertRaw(email)).rejects.toMatchObject({ code: CANONICAL_VIOLATION })
    })

    it('rejects an address padded with a carriage return', async () => {
      const email = '\rcanon-' + randomUUID() + '@example.com\r'
      await expect(insertRaw(email)).rejects.toMatchObject({ code: CANONICAL_VIOLATION })
    })

    it('rejects an address padded with a line feed', async () => {
      const email = '\ncanon-' + randomUUID() + '@example.com\n'
      await expect(insertRaw(email)).rejects.toMatchObject({ code: CANONICAL_VIOLATION })
    })

    it('rejects an address padded with a non-breaking space', async () => {
      const email = '\u00a0canon-' + randomUUID() + '@example.com\u00a0'
      await expect(insertRaw(email)).rejects.toMatchObject({ code: CANONICAL_VIOLATION })
    })

    // With every row canonical, the existing UNIQUE is the case-insensitive
    // uniqueness we wanted — no functional index needed.
    it('still rejects a duplicate of a canonical address', async () => {
      const email = 'dup-' + randomUUID() + '@example.com'
      await insertRaw(email)
      await expect(insertRaw(email)).rejects.toMatchObject({ code: UNIQUE_VIOLATION })
      await db.delete(users).where(eq(users.email, email))
    })

    it('reports the constraint by name, so a failure is diagnosable', async () => {
      const email = 'Nome-' + randomUUID() + '@example.com'
      await expect(insertRaw(email)).rejects.toMatchObject({
        constraint_name: 'users_email_canonical',
      })
    })
  })

  describe('the users -> pages -> media ordering', () => {
    const DEADLOCK_DETECTED = '40P01'
    const INSERT_MEDIA =
      'INSERT INTO media (page_id, filename, mime_type, size_bytes) VALUES ($1, $2, $3, 10)'

    async function seedPage(): Promise<string> {
      const id = randomUUID()
      await db.insert(pages).values({ id, userId: userA, slug: 'order-' + id, title: 'O' })
      return id
    }

    async function unwind() {
      await holder.unsafe('ROLLBACK').catch(() => {})
      await rival.unsafe('ROLLBACK').catch(() => {})
    }

    // Why the invariant exists: taking the page before the user row closes a
    // cycle with an upload that took them in the documented order.
    it('deadlocks when a transaction takes a page before the user row', async () => {
      const pageId = await seedPage()
      const [pidRow] = await holder.unsafe('SELECT pg_backend_pid() AS pid')

      let outcomes: string[]
      try {
        // Upload order: user row first.
        await holder.unsafe('BEGIN')
        await holder.unsafe(LOCK_USER, [userA])

        // The violation: this one grabs the page without holding the user row.
        await rival.unsafe('BEGIN')
        await rival.unsafe('DELETE FROM pages WHERE id = $1', [pageId])

        // The upload now needs the page, through the foreign key on media.
        // .then is what sends it: a postgres.js query is lazy until awaited.
        const insert = settle(holder.unsafe(INSERT_MEDIA, [pageId, randomUUID() + '.webp', 'image/webp']))
        await waitUntilBlocked(Number(pidRow.pid))

        // And the violator now needs the user row: the cycle is closed.
        const lock = settle(rival.unsafe(LOCK_USER, [userA]))
        outcomes = await Promise.all([insert, lock])
      } finally {
        // A failure here must not leave locks held, or every later case hangs.
        await unwind()
      }
      await db.delete(pages).where(eq(pages.id, pageId))

      expect(outcomes).toContain(DEADLOCK_DETECTED)
    }, 20_000)

    it('completes the same interleaving when both take the user row first', async () => {
      const pageId = await seedPage()
      const [rivalPidRow] = await rival.unsafe('SELECT pg_backend_pid() AS pid')
      const rivalPid = Number(rivalPidRow.pid)

      let outcome: string
      try {
        await holder.unsafe('BEGIN')
        await holder.unsafe(LOCK_USER, [userA])
        await holder.unsafe(INSERT_MEDIA, [pageId, randomUUID() + '.webp', 'image/webp'])

        // The delete waits for the user row instead of racing the page, which is
        // what turns the cycle above into a queue.
        await rival.unsafe('BEGIN')
        const lock = settle(rival.unsafe(LOCK_USER, [userA]))
        await waitUntilBlocked(Number(rivalPid))
        await holder.unsafe('COMMIT')
        outcome = await lock
        await rival.unsafe('DELETE FROM pages WHERE id = $1', [pageId])
        await rival.unsafe('COMMIT')
      } finally {
        await unwind()
      }
      await db.delete(pages).where(eq(pages.id, pageId))

      expect(outcome).toBe('ok')
    }, 20_000)
  })

  /**
   * Sends the query now and reports how it ended. A postgres.js query is a lazy
   * thenable: without this it would never reach the server, and a test that
   * expects it to be blocked would wait on something that was never sent.
   */
  function settle(query: PromiseLike<unknown>): Promise<string> {
    return Promise.resolve(query).then(
      () => 'ok',
      (err: { code?: string }) => String(err?.code ?? err),
    )
  }

  /**
   * Asks the server who is blocking `pid` and returns the moment somebody is.
   * Bounded by a deadline rather than a fixed delay: the statement being waited
   * on may not even have reached the server when the first question is asked.
   */
  async function waitUntilBlocked(pid: number, timeoutMs = 5000): Promise<number[]> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const [row] = await observer.unsafe('SELECT pg_blocking_pids($1) AS pids', [pid])
      const pids = row.pids as number[]
      if (pids.length > 0) return pids
    }
    throw new Error('nobody ever showed up as blocking pid ' + pid)
  }
})
