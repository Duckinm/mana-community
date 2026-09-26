import { getSession, signOut } from '@/lib/auth-client'
import { handleUnauthorized } from '@/lib/api-error'
import { queryClient } from '@/lib/query-client'

export const SESSION_SYNC_KEY = 'mana:session-sync'

// These routes are legitimately accessed without a session — never redirect away from them
const UNAUTHENTICATED_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/view']

function isUnauthenticatedPath(pathname: string): boolean {
  return UNAUTHENTICATED_PATHS.some((p) => pathname.startsWith(p))
}

function clearUserCache(): void {
  queryClient.clear()
}

export async function signOutAndSync(): Promise<void> {
  clearUserCache()
  localStorage.setItem(SESSION_SYNC_KEY, String(Date.now()))
  await signOut()
}

export function initSessionSync(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('storage', (e) => {
    if (e.key === SESSION_SYNC_KEY && e.newValue && !isUnauthenticatedPath(window.location.pathname)) {
      clearUserCache()
      handleUnauthorized()
    }
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (isUnauthenticatedPath(window.location.pathname)) return
    void getSession().then((session) => {
      if (!session?.data?.user && !isUnauthenticatedPath(window.location.pathname)) {
        clearUserCache()
        handleUnauthorized()
      }
    })
  })
}
