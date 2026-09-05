/**
 * The manual migration runner, exercised the way an operator runs it: as a
 * separate process, against a real PostgreSQL, reading its exit code.
 *
 * Spawning rather than importing is the point. The bug this runner exists to
 * fix was that a command worked in the checkout and not in the runtime image,
 * and only a real process boundary shows the exit code, the stdout an operator
 * reads, and whether the connection was closed — an unclosed one would hang the
 * process instead of exiting.
 *
 * Runs only with TEST_DATABASE_URL, and never falls back to DATABASE_URL.
 */

import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import postgres from 'postgres'

const run = promisify(execFile)

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
const describeIntegration = TEST_DATABASE_URL ? describe : describe.skip

/**
 * `describe.skip` still runs the callback to collect the test names, so the URL
 * below is parsed even when the suite is skipped. This placeholder keeps that
 * parse from throwing; nothing ever connects to it.
 */
const BASE_URL = TEST_DATABASE_URL ?? 'postgres://skipped:skipped@127.0.0.1:5432/skipped'

const SERVER_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const RUNNER = path.join(SERVER_ROOT, 'dist', 'scripts', 'migrate.js')

/** A database per run, so a previous run cannot make this one pass. */
const DB_NAME = 'bv_runner_' + randomUUID().replace(/-/g, '').slice(0, 12)

interface Result {
  code: number
  stdout: string
  stderr: string
}

describeIntegration('the manual migration runner', () => {
  const admin = postgres(BASE_URL, { max: 1, onnotice: () => {} })
  const target = new URL(BASE_URL)
  target.pathname = '/' + DB_NAME
  const targetUrl = target.toString()

  /**
   * Runs the compiled runner exactly as the operator command does.
   *
   * `bare` reproduces the container: PATH and DATABASE_URL, nothing else. The
   * runner failed on the first real attempt from the deployed image precisely
   * because it demanded AUTH_SECRET, so the environment has to be this empty
   * for the test to mean anything.
   */
  async function migrate(databaseUrl: string | undefined, bare = false): Promise<Result> {
    const env: NodeJS.ProcessEnv = bare
      ? { PATH: process.env.PATH, ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}) }
      : {
          ...process.env,
          DATABASE_URL: databaseUrl,
          AUTH_SECRET: 'a'.repeat(40),
          TEST_DATABASE_URL: undefined,
        }
    try {
      const { stdout, stderr } = await run(process.execPath, [RUNNER], { env })
      return { code: 0, stdout, stderr }
    } catch (err) {
      const e = err as { code?: number; stdout?: string; stderr?: string }
      return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' }
    }
  }

  function onTarget<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
    const sql = postgres(targetUrl, { max: 1, onnotice: () => {} })
    return fn(sql).finally(() => sql.end())
  }

  beforeAll(async () => {
    await admin.unsafe('CREATE DATABASE "' + DB_NAME + '"')
  })

  afterAll(async () => {
    await admin.unsafe('DROP DATABASE IF EXISTS "' + DB_NAME + '" WITH (FORCE)')
    await admin.end()
  })

  it('succeeds on a fresh database', async () => {
    const result = await migrate(targetUrl)
    expect(result.code).toBe(0)
  })

  it('says so in a line an operator can read', async () => {
    const result = await migrate(targetUrl)
    expect(result.stdout).toContain('[migrate] done')
  })

  it('creates the schema the migrations describe', async () => {
    const rows = await onTarget((sql) => sql`
      SELECT conname FROM pg_constraint WHERE conname = 'users_email_canonical'`)
    expect(rows).toHaveLength(1)
  })

  it('records every migration in the drizzle journal', async () => {
    const [row] = await onTarget((sql) => sql`
      SELECT count(*)::int AS total FROM drizzle.__drizzle_migrations`)
    expect(row.total).toBe(7)
  })

  // Running it twice must be safe: an operator who is unsure whether it already
  // ran should be able to just run it again.
  it('is a no-op on the second run', async () => {
    const result = await migrate(targetUrl)
    expect(result.code).toBe(0)
  })

  it('does not apply anything twice', async () => {
    await migrate(targetUrl)
    const [row] = await onTarget((sql) => sql`
      SELECT count(*)::int AS total FROM drizzle.__drizzle_migrations`)
    expect(row.total).toBe(7)
  })

  it('never prints the connection string', async () => {
    const result = await migrate(targetUrl)
    expect(result.stdout + result.stderr).not.toContain(target.password)
  })

  // The failure seen on the first real run from the deployed image: the runner
  // imported the application config, which validates AUTH_SECRET at load, and
  // died before opening a connection. Migrating a database must not require the
  // session secret.
  describe('with nothing in the environment but DATABASE_URL', () => {
    it('succeeds without AUTH_SECRET or any other application variable', async () => {
      const result = await migrate(targetUrl, true)
      expect(result.code).toBe(0)
    })

    it('reaches the database instead of dying at import time', async () => {
      const result = await migrate(targetUrl, true)
      expect(result.stdout).toContain('[migrate] done')
    })

    it('never mentions AUTH_SECRET', async () => {
      const result = await migrate(targetUrl, true)
      expect(result.stdout + result.stderr).not.toContain('AUTH_SECRET')
    })

    it('still hides the credentials', async () => {
      const result = await migrate(targetUrl, true)
      expect(result.stdout + result.stderr).not.toContain(target.password)
    })
  })

  describe('without DATABASE_URL', () => {
    it('exits non-zero', async () => {
      const result = await migrate(undefined, true)
      expect(result.code).not.toBe(0)
    })

    it('names the variable that is missing', async () => {
      const result = await migrate(undefined, true)
      expect(result.stderr).toContain('DATABASE_URL environment variable is not set')
    })
  })

  describe('when the migration cannot be applied', () => {
    const FAILING_DB = DB_NAME + '_fail'
    const failing = new URL(BASE_URL)
    failing.pathname = '/' + FAILING_DB

    beforeAll(async () => {
      await admin.unsafe('CREATE DATABASE "' + FAILING_DB + '"')
      const sql = postgres(failing.toString(), { max: 1, onnotice: () => {} })
      // Everything up to 0004, then two rows that only collide once the e-mail
      // is canonicalised — exactly what 0005's guard exists to catch.
      await migrate(failing.toString())
      await sql.unsafe(`ALTER TABLE users DROP CONSTRAINT users_email_canonical`)
      await sql.unsafe(`DELETE FROM drizzle.__drizzle_migrations
                        WHERE created_at = (SELECT max(created_at) FROM drizzle.__drizzle_migrations)`)
      await sql.unsafe(`INSERT INTO users (email, name, password_hash)
                        VALUES ('c@x.com', 'A', 'x'), (E'c@x.com\\t', 'B', 'x')`)
      await sql.end()
    })

    afterAll(async () => {
      await admin.unsafe('DROP DATABASE IF EXISTS "' + FAILING_DB + '" WITH (FORCE)')
    })

    it('exits non-zero', async () => {
      const result = await migrate(failing.toString())
      expect(result.code).not.toBe(0)
    })

    // Drizzle wraps the failure as "Failed query: <the whole file>"; the reason
    // the operator needs is in the cause, and it has to reach the output.
    it('reports the reason rather than the whole SQL file', async () => {
      const result = await migrate(failing.toString())
      expect(result.stderr).toContain('Migracao abortada')
    })

    it('leaves the constraint unapplied', async () => {
      await migrate(failing.toString())
      const sql = postgres(failing.toString(), { max: 1, onnotice: () => {} })
      const rows = await sql`
        SELECT conname FROM pg_constraint WHERE conname = 'users_email_canonical'`
        .finally(() => sql.end())
      expect(rows).toHaveLength(0)
    })

    // An unclosed connection would leave the process running and the operator
    // waiting; the promisified exec only resolves once the process exits.
    it('still exits instead of hanging on the open connection', async () => {
      const result = await migrate(failing.toString())
      expect(result.code).toBe(1)
    })
  })
})
