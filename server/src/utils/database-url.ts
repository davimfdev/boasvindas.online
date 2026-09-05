/**
 * Describing a connection string without exposing it.
 *
 * Lives apart from `config.ts` on purpose: that module validates the whole
 * application at import time — it throws when `AUTH_SECRET` is missing — so
 * anything that only needs to talk to the database, such as the migration
 * runner, must not be forced to import it.
 */

/**
 * Host, port and database name of a connection string — never the user or the
 * password. The only form of a DATABASE_URL that may reach a log line.
 */
export function describeDatabaseTarget(url: string): string {
  try {
    const parsed = new URL(url)
    const port = parsed.port || '5432'
    return `${parsed.hostname}:${port}${parsed.pathname}`
  } catch {
    return '<unparseable DATABASE_URL>'
  }
}
