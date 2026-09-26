import { env } from '@api/env'

export function requireCronSecret<T>(
  request: Request,
  status: (code: 401, body: { message: string }) => T,
  cronSecret = env.CRON_SECRET,
): T | null {
  const supplied = request.headers.get('x-cron-secret')
  if (!supplied || !cronSecret || supplied !== cronSecret) {
    return status(401, { message: 'Unauthorized' })
  }
  return null
}
