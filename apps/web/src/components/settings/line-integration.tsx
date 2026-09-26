import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { LineConnectSteps } from '@/components/settings/line-connect-steps'
import { LineNotificationPreferences } from '@/components/settings/line-notification-preferences'
import { useLineConnection } from '@/hooks/use-line-connection'
import { useSettings } from '@/context/settings'
import type { NotificationPreferences } from '@/lib/notification-preferences'

function LineIcon() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" fill="none" aria-hidden>
      <rect width="32" height="32" rx="6" fill="#06C755" />
      <path
        d="M16 8c-4.97 0-9 3.24-9 7.24 0 3.58 3.2 6.58 7.52 7.15.29.06.69.19.79.44.09.22.06.57.03.8l-.13.77c-.04.22-.17.87.76.48.94-.4 5.06-2.98 6.9-5.1C24.15 18 25 16.7 25 15.24 25 11.24 20.97 8 16 8Z"
        fill="#fff"
      />
    </svg>
  )
}

function LineHeader({ icon, name, sub }: { icon: React.ReactNode; name: string; sub: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-raised">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

export function LineIntegration() {
  const { t } = useTranslation('settings')
  const { connection, isLoading, connect, disconnect, isPending } = useLineConnection()
  const { user, patchUser, saveFnRef } = useSettings()
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    () => user?.notificationPreferences ?? {},
  )

  useEffect(() => {
    if (!user) return
    setPreferences(user.notificationPreferences ?? {})
  }, [user])

  useEffect(() => {
    saveFnRef.current = () => patchUser({ notificationPreferences: preferences }).then(() => {})
    return () => {
      saveFnRef.current = null
    }
  }, [preferences, patchUser, saveFnRef])

  async function handleConnect() {
    try {
      await connect()
    } catch {
      toast.error(t('integrations.line.connectFailed'))
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect()
      toast.success(t('integrations.line.disconnected'))
    } catch {
      toast.error(t('integrations.line.disconnectFailed'))
    }
  }

  const connected = !!connection?.connected
  const pending = !connected && !!connection?.pending
  const lineConfigured = connection?.lineConfigured ?? true
  if (connected) {
    return (
      <Accordion type="single" collapsible className="rounded-xl border border-border-default bg-surface-card transition-colors duration-base hover:border-border-strong">
        <AccordionItem value="line" className="border-b-0">
          <AccordionTrigger className="px-4 py-4 hover:no-underline justify-between gap-2">
            <LineHeader icon={<LineIcon />} name={t('integrations.line.name')} sub={connection.displayName || t('integrations.line.description')} />
            <Badge variant="success" size="pill" className="mr-2 gap-1.5">
              <StatusDot status="active" />
              {t('integrations.connected')}
            </Badge>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            <LineNotificationPreferences
              preferences={preferences}
              onChange={(key, checked) =>
                setPreferences((current) => ({ ...current, [key]: checked }))
              }
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={isPending || isLoading}
                onClick={() => void handleDisconnect()}
                className="min-h-9 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-base hover:border-border-default hover:text-foreground disabled:opacity-60 sm:min-h-8"
              >
                {t('integrations.disconnect')}
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  if (pending && connection?.linkCode) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-card">
        <div className="flex items-start gap-3 px-4 py-4 sm:gap-4">
          <LineHeader icon={<LineIcon />} name={t('integrations.line.name')} sub={t('integrations.line.stepsIntro')} />
          <Badge variant="warning" size="pill" className="mt-0.5 shrink-0">
            {t('integrations.line.pendingTitle')}
          </Badge>
        </div>
        <LineConnectSteps
          linkCode={connection.linkCode}
          addFriendUrl={connection.addFriendUrl}
          sendCodeUrl={connection.sendCodeUrl}
          expiresAt={connection.expiresAt}
          onNewCode={() => void handleConnect()}
          isPending={isPending}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-xl border border-border-default bg-surface-card px-4 py-4 transition-colors duration-base hover:border-border-strong sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-x-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-raised">
        <LineIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {t('integrations.line.name')}
        </p>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
          {t('integrations.line.description')}
        </p>
      </div>

      <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3 sm:row-start-1 sm:justify-end">
        {!lineConfigured ? (
          <Badge variant="muted" size="pill" className="gap-1.5">
            {t('integrations.line.notConfigured')}
          </Badge>
        ) : (
          <button
            type="button"
            disabled={isPending || isLoading}
            onClick={() => void handleConnect()}
            className="min-h-9 rounded-lg border border-primary-border bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition-colors duration-base hover:bg-primary-hover hover:text-primary-foreground disabled:opacity-60 sm:min-h-8"
          >
            {t('integrations.connect')}
          </button>
        )}
      </div>
    </div>
  )
}
