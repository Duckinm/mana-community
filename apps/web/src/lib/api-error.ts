import { getSession } from '@/lib/auth-client'
import i18next from '@/lib/i18n'
import { toast } from 'sonner'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isUnauthorizedError(error: unknown): boolean {
  return isApiError(error) && error.status === 401
}

let handlingUnauthorized = false

// A single 401 can come from one buggy/racy endpoint, not a dead session — re-check
// with a fresh (uncached) getSession() before nuking the whole app to /login.
export async function handleUnauthorized(): Promise<void> {
  if (handlingUnauthorized || typeof window === 'undefined') return
  handlingUnauthorized = true
  const session = await getSession().catch(() => null)
  if (session?.data?.user) {
    handlingUnauthorized = false
    return
  }
  toast.error(i18next.t('sessionExpired', { ns: 'common' }), {
    description: i18next.t('sessionExpiredDescription', { ns: 'common' }),
  })
  window.location.assign('/login')
}

export function handleQueryError(error: unknown): void {
  if (isUnauthorizedError(error)) {
    handleUnauthorized()
  }
}

function readStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const record = error as Record<string, unknown>
  if (typeof record.status === 'number') return record.status
  if ('value' in record) return readStatus(record.value)
  return undefined
}

export function toApiError(error: unknown, message: string): ApiError {
  const status = readStatus(error) ?? 500
  return new ApiError(message, status)
}
