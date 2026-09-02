import { createApp } from './app.js'
import { config, describeDatabaseTarget } from './config.js'
import { client } from './db/index.js'

const app = createApp()

const server = app.listen(config.port, config.host, () => {
  console.log(`[api] listening on http://${config.host}:${config.port}`)
  console.log(`[api] env=${config.isProduction ? 'production' : 'development'}`)
  console.log(`[api] database -> ${describeDatabaseTarget(config.databaseUrl)}`)
})

function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down`)
  server.close(() => {
    void client.end({ timeout: 5 }).finally(() => process.exit(0))
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
