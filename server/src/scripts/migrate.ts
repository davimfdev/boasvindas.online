/**
 * Applies pending Drizzle migrations, by hand, from inside the running API
 * container.
 *
 * It exists because the documented `npx drizzle-kit migrate` cannot work there:
 * drizzle-kit is a devDependency and the runtime image installs with
 * `--omit=dev`, and `drizzle.config.ts` is not copied into the image either. The
 * runtime migrator that ships with `drizzle-orm` — already a production
 * dependency — needs neither.
 *
 * Deliberately manual. Nothing imports this module: not the server, not the
 * container start command. Migrations run when an operator decides they run,
 * with a backup already taken, and never as a side effect of a deploy.
 */

import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { describeDatabaseTarget } from '../utils/database-url.js'

/**
 * Two levels up lands on the folder that ships the SQL: `server/migrations` in
 * a checkout, `/app/migrations` in the image, because `dist/` mirrors `src/`.
 */
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../migrations', import.meta.url))

/**
 * The runner asks for DATABASE_URL and nothing else.
 *
 * Importing `config.js` would validate the entire application at module load —
 * it throws without `AUTH_SECRET` — and a database migration has no business
 * demanding the session secret. That is exactly how this failed on the first
 * real attempt from the deployed image.
 */
function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    // Exits rather than throws: this runs before anything is opened, so there
    // is nothing to clean up, and the operator gets the same one-line shape as
    // every other failure instead of a stack trace.
    console.error('[migrate] FAILED: DATABASE_URL environment variable is not set')
    process.exit(1)
  }
  return url
}

const databaseUrl = requireDatabaseUrl()

/**
 * Its own connection rather than the server's pool: this is a one-shot
 * sequential job, so a single link is enough, and `onnotice` keeps PostgreSQL's
 * "schema already exists, skipping" chatter out of the output — on a re-run it
 * is printed as a raw object and reads exactly like a failure, which is the
 * opposite of what an operator needs to see. The TLS rule mirrors db/index.ts.
 */
const client = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  ssl: process.env.DATABASE_SSL === 'require' ? 'require' : undefined,
  onnotice: () => {},
})

const db = drizzle(client)

async function main(): Promise<void> {
  // describeDatabaseTarget gives host, port and database — never the user or
  // the password. The connection string must not reach a log line.
  console.log(`[migrate] database -> ${describeDatabaseTarget(databaseUrl)}`)
  console.log(`[migrate] folder   -> ${MIGRATIONS_FOLDER}`)
  console.log('[migrate] applying pending migrations…')

  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })

  console.log('[migrate] done — every pending migration was applied')
}

/**
 * The reason, not the haystack.
 *
 * Drizzle wraps a failure as `Failed query: <the whole SQL file>` and hides the
 * PostgreSQL error — the one line that says what actually went wrong — in
 * `cause`. Printing the wrapper buries the collision guard's own message under
 * fifty lines of comments. Message and code only, never the error object, which
 * could carry connection details.
 */
function describeError(err: unknown): string {
  if (typeof err !== 'object' || err === null) return String(err)
  const { message, code, cause } = err as { message?: unknown; code?: unknown; cause?: unknown }
  if (cause !== undefined && cause !== null) return describeError(cause)
  return code ? `${String(message)} (${String(code)})` : String(message)
}

await main()
  .catch((err: unknown) => {
    console.error(`[migrate] FAILED: ${describeError(err)}`)
    console.error('[migrate] nothing was applied — the migrator runs inside one transaction')
    process.exitCode = 1
  })
  // Always: a leaked connection would keep the process alive and hide the exit
  // code from whoever is watching.
  .finally(() => client.end({ timeout: 5 }))
