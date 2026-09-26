import * as Sentry from '@sentry/bun'
import { env } from '@api/env'

// Check-ins only from production — a dev server would register phantom monitor
// environments that alert "missed" whenever the laptop closes.
export function withCronMonitor<T>(
  slug: string,
  crontab: string,
  fn: () => Promise<T>,
  { checkinMargin = 10, maxRuntime = 10 } = {},
): Promise<T> {
  if (env.NODE_ENV !== 'production') return fn()
  return Sentry.withMonitor(slug, fn, {
    schedule: { type: 'crontab', value: crontab },
    checkinMargin,
    maxRuntime,
  })
}

type CronOptions = {
  checkinMargin?: number
  maxRuntime?: number
}

/** The single cron adapter: monitoring and failure reporting must not be left
 * to individual schedules, or a missed tick becomes invisible. */
export function registerCron<T>(
  name: string,
  pattern: string,
  task: () => Promise<T>,
  options?: CronOptions,
) {
  return {
    name,
    pattern,
    async run() {
      try {
        await withCronMonitor(name, pattern, task, options)
      } catch (error) {
        console.error(`${name} failed`, error)
        Sentry.captureException(error)
      }
    },
  }
}
