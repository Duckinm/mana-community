import { createAuthClient } from 'better-auth/react'
import { adminClient, lastLoginMethodClient } from 'better-auth/client/plugins'
import { resolveApiBaseUrl } from '@/lib/api-base-url'
import { STORAGE_KEY } from '@/lib/i18n'

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const locale = localStorage.getItem(STORAGE_KEY)
  if (locale === 'en' || locale === 'th') headers.set('Accept-Language', locale)
  return fetch(input, { ...init, headers })
}

const authClient = createAuthClient({
  baseURL: resolveApiBaseUrl(),
  fetchOptions: {
    customFetchImpl: authFetch,
  },
  // adminClient: only for session.impersonatedBy typing on useSession —
  // admin mutations stay in the control panel (C-418)
  plugins: [lastLoginMethodClient(), adminClient()],
})

export const {
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  linkSocial,
  listAccounts,
  unlinkAccount,
  getLastUsedLoginMethod,
  clearLastUsedLoginMethod,
  isLastUsedLoginMethod,
} = authClient

// Router beforeLoad re-runs getSession() on every navigation (even hover-preload),
// so an unrelated network hiccup could kick a logged-in user to /login. Dedupe those
// bursts behind a short-lived cache; $sessionSignal flips (sign-in/out/etc.) clear it.
const SESSION_CACHE_MS = 15_000
let sessionCache: { promise: ReturnType<typeof getSession>; expires: number } | null = null

export function getSessionCached() {
  const now = Date.now()
  if (sessionCache && sessionCache.expires > now) return sessionCache.promise
  const promise = getSession()
  promise.catch(() => {
    sessionCache = null
  })
  sessionCache = { promise, expires: now + SESSION_CACHE_MS }
  return promise
}

authClient.$store.listen('$sessionSignal', () => {
  sessionCache = null
})
