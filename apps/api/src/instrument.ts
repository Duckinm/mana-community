import * as Sentry from '@sentry/bun'
import { env } from '@api/env'

// .env.example ships the real DSN, so every dev machine reports too — a laptop
// with Postgres down once filed 294 cron failures (MANA-API-7). Deploys only;
// `!== development` so staging still reports.
if (env.SENTRY_DSN && env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // C-351: no business content in telemetry — metadata only
    sendDefaultPii: false,
    tracesSampler: ({ name }) => {
      // uptime pings + CORS preflights would eat the span quota for zero signal
      if (name.startsWith('OPTIONS') || name.includes('/health')) return 0
      // crons fire a few times a day and are exactly what C-351 wants watched
      if (name.includes('/api/cron/')) return 1
      return env.SENTRY_TRACES_SAMPLE_RATE
    },
  })
}

// A rejected promise nobody awaited (fire-and-forget notification, background job)
// should never take the whole API down — log it and move on.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason)
  Sentry.captureException(reason)
})

// An uncaught exception means the process is in an unknown state — flush telemetry
// then exit so Fly restarts a clean instance instead of running on corrupted state.
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error)
  Sentry.captureException(error)
  Sentry.flush(2000).finally(() => process.exit(1))
})
