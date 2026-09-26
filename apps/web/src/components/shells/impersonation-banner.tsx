import { useSession } from '@/lib/auth-client'
import { signOutAndSync } from '@/lib/session-sync'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function ImpersonationBanner() {
  const { t } = useTranslation('auth')
  const { data } = useSession()
  const [pending, setPending] = useState(false)

  if (!data?.session.impersonatedBy) return null

  async function handleExit() {
    setPending(true)
    try {
      // plain sign-out, never stop-impersonating: better-auth "restore" would put
      // the control panel's admin session into the web cookie, re-coupling them (C-418)
      await signOutAndSync()
    } finally {
      window.location.assign('/login')
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-full border border-border-subtle bg-warning-soft px-4 py-2 text-sm text-warning shadow-popup">
      <span className="truncate">
        {t('impersonation.viewingAs', { email: data.user.email })}
      </span>
      <button
        type="button"
        onClick={handleExit}
        disabled={pending}
        className="shrink-0 font-medium underline underline-offset-2 transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {t('impersonation.exit')}
      </button>
    </div>
  )
}
