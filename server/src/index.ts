import { createApp } from './app.js'
import { config, describeDatabaseTarget } from './config.js'
import { client } from './db/index.js'

const app = createApp()

const server = app.listen(config.port, config.host, () => {
  console.log(`[api] listening on http://${config.host}:${config.port}`)
  console.log(`[api] env=${config.isProduction ? 'production' : 'development'}`)
  console.log(`[api] database -> ${describeDatabaseTarget(config.databaseUrl)}`)
  void checkDatabaseOnBoot()
})

/**
 * One-off connectivity check logged right after boot. The process must stay up
 * and keep answering /health even when this fails — Coolify restart-loops a
 * container that exits, which would turn a database outage into a full outage.
 */
async function checkDatabaseOnBoot() {
  try {
    await client`select 1`
    console.log('[api] database ok')
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : 'unknown'
    console.error(`[api] database unreachable: ${code}`)
  }
}

function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down`)
  server.close(() => {
    void client.end({ timeout: 5 }).finally(() => process.exit(0))
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
