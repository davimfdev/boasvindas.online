import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '../config.js'
import * as schema from './schema.js'

// Plain TCP driver instead of @neondatabase/serverless: the API is a long-lived
// process, so a pooled connection works for both Neon and a self-hosted Postgres.
const client = postgres(config.databaseUrl, {
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  idle_timeout: 30,
  connect_timeout: 10,
  // Neon and most managed providers require TLS; a VPS-local Postgres usually does not.
  ssl: process.env.DATABASE_SSL === 'require' ? 'require' : undefined,
})

export const db = drizzle(client, { schema })
export { client }
