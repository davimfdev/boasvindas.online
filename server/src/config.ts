/**
 * Central environment resolution. Every value the API needs is read once here so
 * a missing variable fails fast at boot instead of on the first request.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} environment variable is not set`)
  return value
}

function list(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/**
 * Host, port and database name of a connection string — never the user or the
 * password. The only form of DATABASE_URL that may reach a log line.
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

export const config = {
  isProduction: process.env.NODE_ENV === 'production',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  authSecret: required('AUTH_SECRET'),
  /** Origins allowed to send credentialed requests. The SPA is served from these. */
  corsOrigins: list('CORS_ORIGINS', 'https://boasvindas.online,https://www.boasvindas.online'),
  /** Public origin of the site, used for absolute links in responses. */
  publicOrigin: process.env.PUBLIC_ORIGIN ?? 'https://boasvindas.online',
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'bv_session',
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE ?? 60 * 60 * 24 * 30),
  /**
   * Directory holding uploaded guest-page images. In production this is the
   * mount point of a persistent Coolify volume; outside it, set MEDIA_DIR to a
   * writable path so a local run never reaches for a container-only directory.
   */
  mediaDir: process.env.MEDIA_DIR ?? '/app/media',
  /** Largest upload accepted, in bytes. */
  mediaMaxBytes: Number(process.env.MEDIA_MAX_BYTES ?? 10 * 1024 * 1024),
  /** Total stored image bytes one account may hold across all of its pages. */
  mediaQuotaBytes: Number(process.env.MEDIA_QUOTA_BYTES ?? 200 * 1024 * 1024),
} as const
