import { useCapabilities } from '@/hooks/use-capabilities'
import { CapabilityNotice, EmailCapabilityNotice } from '@/components/capability-notice'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  NotificationPreferenceMatrix,
  type NotificationEventOption,
} from '@/components/settings/notification-preference-matrix'
import { Toggle } from '@/components/settings/shared'
import { ExternalLink, Puzzle } from '@/components/icons'
import { Badge, StatusDot } from '@/components/ui/badge'
import { useSettings } from '@/context/settings'
import { useLineConnection } from '@/hooks/use-line-connection'
import {
  NOTIFICATION_EVENT_GROUPS,
  type NotificationChannel,
  type NotificationEvent,
  type NotificationPreferences,
} from '@/lib/notification-preferences'
import { pushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/push'

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string
  title: string
  description: string
}) {
  return (
    <div>
      <h3 id={id} className="text-sm font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-caption">{description}</p>
    </div>
  )
}

function BrowserPushRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border-default bg-surface-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-caption">{description}</p>
      </div>
      <Toggle on={checked} onChange={onChange} ariaLabel={label} />
    </div>
  )
}

function BrowserPushUnavailable({
  label,
  description,
  status,
}: {
  label: string
  description: string
  status: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border-default bg-surface-card px-4 py-3 opacity-60">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-caption">{description}</p>
      </div>
      <Badge variant="muted" size="sm">
        {status}
      </Badge>
    </div>
  )
}

export function NotificationsPanel() {
  const capabilities = useCapabilities()
  const pushConfigured = !capabilities.isError && capabilities.data?.push === true && !!import.meta.env.VITE_VAPID_PUBLIC_KEY
  const { t } = useTranslation('settings')
  const { t: tCapabilities } = useTranslation('capabilities')
  const { user, saveFnRef, patchUser } = useSettings()
  const { connection } = useLineConnection()
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    () => user?.notificationPreferences ?? {},
  )
  const [desktopPush, setDesktopPush] = useState(user?.notifDesktopPush ?? false)

  useEffect(() => {
    if (!user) return
    setPreferences(user.notificationPreferences ?? {})
    setDesktopPush(user.notifDesktopPush ?? false)
  }, [user])

  useEffect(() => {
    saveFnRef.current = () => patchUser({ notificationPreferences: preferences }).then(() => {})
    return () => {
      saveFnRef.current = null
    }
  }, [preferences, patchUser, saveFnRef])

  const toggleDesktopPush = async () => {
    if (desktopPush) {
      await unsubscribeFromPush().catch(() => {})
      setDesktopPush(false)
      await patchUser({ notifDesktopPush: false })
      return
    }

    try {
      await subscribeToPush()
      setDesktopPush(true)
      await patchUser({ notifDesktopPush: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('notifications.browser.failed'))
    }
  }

  const event = (key: NotificationEvent): NotificationEventOption => ({
    key,
    label: t(`notifications.events.${key}.label`),
    description: t(`notifications.events.${key}.description`),
  })

  const groups = NOTIFICATION_EVENT_GROUPS.map((group) => ({
    key: group.key,
    title: t(`notifications.groups.${group.key}.title`),
    description: t(`notifications.groups.${group.key}.description`),
    events: group.events.map(event),
  }))

  const channelLabels: Record<NotificationChannel, string> = {
    inApp: t('notifications.channels.inApp'),
    email: t('notifications.channels.email'),
    push: t('notifications.channels.push'),
    line: t('notifications.channels.line'),
  }

  const pushBlocked =
    typeof Notification === 'undefined' ? false : Notification.permission === 'denied'
  const lineConnected = !!connection?.connected && !capabilities.isError && capabilities.data?.line === true
  const lockedChannels: NotificationChannel[] = []
  if (!lineConnected) lockedChannels.push('line')
  if (!pushConfigured) lockedChannels.push('push')
  if (capabilities.isError || !capabilities.data || capabilities.data.email === 'disabled') lockedChannels.push('email')

  return (
    <div className="space-y-6">
      <section aria-labelledby="notification-integrations-title">
        <div className="rounded-xl border border-border-default bg-surface-raised p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary-border bg-primary-soft">
                <Puzzle size={17} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h3
                  id="notification-integrations-title"
                  className="text-sm font-semibold text-foreground"
                >
                  {t('notifications.integrations.title')}
                </h3>
                <p className="mt-0.5 max-w-[65ch] text-xs leading-relaxed text-caption">
                  {t('notifications.integrations.description')}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
              <Badge
                variant={lineConnected ? 'success' : 'muted'}
                size="pill-sm"
                className="gap-1.5"
              >
                <StatusDot status={lineConnected ? 'active' : 'inactive'} />
                {lineConnected
                  ? t('notifications.integrations.lineConnected')
                  : t('notifications.integrations.lineDisconnected')}
              </Badge>
              <Link
                to="/settings/integrations"
                className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary transition-colors duration-base hover:bg-primary-soft"
              >
                {t('notifications.integrations.manage')}
                <ExternalLink size={13} aria-hidden />
              </Link>
            </div>
          </div>
          <p className="mt-3 border-t border-border-subtle pt-3 text-xs leading-relaxed text-caption">
            {t('notifications.integrations.calendarNote')}
          </p>
        </div>
      </section>

      <section aria-labelledby="browser-notifications-title" className="space-y-2.5">
        <SectionHeading
          id="browser-notifications-title"
          title={t('notifications.browser.title')}
          description={t('notifications.browser.description')}
        />
        <CapabilityNotice available={capabilities.data ? pushConfigured : undefined} unavailableKey="pushUnavailable" />
        {pushSupported() && !pushBlocked ? (desktopPush || pushConfigured) && (
          <BrowserPushRow
            label={t('notifications.browser.master')}
            description={t('notifications.browser.masterDescription')}
            checked={desktopPush}
            onChange={() => void toggleDesktopPush()}
          />
        ) : (
          <BrowserPushUnavailable
            label={t('notifications.browser.master')}
            description={
              pushBlocked
                ? t('notifications.browser.blockedDescription')
                : t('notifications.browser.unsupportedDescription')
            }
            status={pushBlocked ? t('notifications.blocked') : t('notifications.unavailable')}
          />
        )}
      </section>

      <section aria-label={t('notifications.eventsTitle')}>
        <EmailCapabilityNotice />
        <p className="mb-3 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
          {t('notifications.eventsDescription')}
        </p>
        <NotificationPreferenceMatrix
          groups={groups}
          eventLabel={t('notifications.eventColumn')}
          channelLabels={channelLabels}
          preferences={preferences}
          soonLabel={t('notifications.soon')}
          lockedChannels={lockedChannels}
          lockedHint={tCapabilities('channelUnavailable')}
          onChange={(key, checked) =>
            setPreferences((current) => ({ ...current, [key]: checked }))
          }
        />
      </section>
    </div>
  )
}
