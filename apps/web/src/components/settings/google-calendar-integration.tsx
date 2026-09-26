import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Badge, StatusDot } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettings } from '@/context/settings'
import { useCalendarConnection } from '@/hooks/use-calendar-connection'
import { linkSocial } from '@/lib/auth-client'
import { formatTimestampRelative } from '@/lib/timestamp'
import { CALENDAR_SYNC_ALLOWED, type PlanId } from '@mana/db/plan-entitlements'
import { GOOGLE_CALENDAR_SCOPES } from '@mana/db/google-scopes'
import { Link } from '@tanstack/react-router'

function GoogleCalendarIcon() {
  return (
    <svg viewBox="0 0 200 200" width="20" height="20" aria-hidden>
      <path fill="#fff" d="M152 48H48v104h104z" />
      <path fill="#1967d2" d="M152 200l48-48h-48z" />
      <path fill="#fbbc04" d="M200 48h-48v104h48z" />
      <path fill="#34a853" d="M152 152H48v48h104z" />
      <path fill="#188038" d="M0 152v32a16 16 0 0016 16h32v-48z" />
      <path fill="#1a73e8" d="M200 48V16a16 16 0 00-16-16h-32v48z" />
      <path fill="#4285f4" d="M152 0H16A16 16 0 000 16v136h48V48h104z" />
      <path
        fill="#4285f4"
        d="M68.2 129.9c-4-2.7-6.8-6.7-8.3-11.9l9-3.7c.8 3.2 2.3 5.7 4.4 7.5 2.1 1.8 4.6 2.6 7.6 2.6 3 0 5.6-.9 7.8-2.8 2.2-1.8 3.3-4.2 3.3-7 0-2.9-1.2-5.3-3.5-7.1-2.3-1.8-5.2-2.8-8.7-2.8h-5.2v-8.9h4.7c3 0 5.5-.8 7.6-2.4 2-1.6 3-3.8 3-6.6 0-2.5-.9-4.5-2.7-6-1.8-1.5-4.1-2.2-6.9-2.2-2.7 0-4.9.7-6.5 2.2-1.6 1.5-2.8 3.3-3.5 5.4l-8.9-3.7c1.2-3.4 3.4-6.4 6.6-9 3.2-2.6 7.3-3.9 12.3-3.9 3.7 0 7 .7 9.9 2.1 2.9 1.4 5.2 3.4 6.9 5.9 1.7 2.5 2.5 5.4 2.5 8.5 0 3.2-.8 5.9-2.3 8.1-1.5 2.2-3.4 3.9-5.7 5.1v.5c3 1.2 5.4 3.1 7.3 5.7 1.9 2.6 2.8 5.6 2.8 9.1s-.9 6.6-2.7 9.4c-1.8 2.8-4.2 4.9-7.4 6.5-3.1 1.6-6.6 2.4-10.5 2.4-4.5 0-8.7-1.3-12.7-4zM123.7 84.7l-9.9 7.2-4.9-7.5 17.7-12.8h6.8v60.3h-9.7z"
      />
    </svg>
  )
}

export function GoogleCalendarIntegration() {
  const { t } = useTranslation('settings')
  const { user } = useSettings()
  const plan = (user?.plan as PlanId | undefined) ?? 'free'
  const syncLocked = !CALENDAR_SYNC_ALLOWED[plan]
  const {
    connection,
    calendarGroups,
    isLoading,
    isCalendarsLoading,
    calendarsError,
    addCalendar,
    removeCalendar,
    disconnect,
    sync,
    isPending,
    refetch,
  } = useCalendarConnection()

  async function handleConnect() {
    if (!connection?.oauthConfigured) {
      toast.error(t('integrations.googleCalendar.oauthNotConfigured'), {
        description: t('integrations.oauthNotConfiguredHint'),
      })
      return
    }

    try {
      await linkSocial({
        provider: 'google',
        callbackURL: `${window.location.origin}/settings/integrations`,
        errorCallbackURL: `${window.location.origin}/settings/integrations`,
        scopes: GOOGLE_CALENDAR_SCOPES,
      })
      await refetch()
    } catch {
      toast.error(t('integrations.googleCalendar.connectFailed'))
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect()
      toast.success(t('integrations.googleCalendar.disconnected'))
    } catch {
      toast.error(t('integrations.googleCalendar.disconnectFailed'))
    }
  }

  async function handleAddCalendar(value: string) {
    const separatorIndex = value.indexOf(':')
    if (separatorIndex === -1) return
    const accountId = value.slice(0, separatorIndex)
    const calendarId = value.slice(separatorIndex + 1)

    const group = calendarGroups.find((item) => item.accountId === accountId)
    const calendar = group?.calendars.find((item) => item.id === calendarId)
    if (!group || !calendar) return

    try {
      await addCalendar({
        accountId,
        calendarId: calendar.id,
        calendarName: calendar.name || calendar.id,
        accountEmail: group.accountEmail,
      })
      toast.success(t('integrations.googleCalendar.calendarSelected'))
    } catch {
      toast.error(t('integrations.googleCalendar.selectFailed'))
    }
  }

  async function handleSync() {
    try {
      await sync()
      toast.success(t('integrations.googleCalendar.syncSucceeded'))
    } catch {
      toast.error(t('integrations.googleCalendar.syncFailed'))
    }
  }

  async function handleRemoveCalendar(connectionId: string) {
    try {
      await removeCalendar(connectionId)
      toast.success(t('integrations.googleCalendar.calendarRemoved'))
    } catch {
      toast.error(t('integrations.googleCalendar.removeFailed'))
    }
  }

  const connected = !!connection?.connected
  const syncedCalendars = connection?.calendars ?? []
  const limit = connection ? connection.limit : 1
  const atLimit = limit !== null && syncedCalendars.length >= limit

  const syncedByAccount = new Map<string, typeof syncedCalendars>()
  for (const calendar of syncedCalendars) {
    const key = calendar.accountEmail ?? ''
    const bucket = syncedByAccount.get(key)
    if (bucket) bucket.push(calendar)
    else syncedByAccount.set(key, [calendar])
  }

  const groupsWithAvailability = calendarGroups.map((group) => ({
    ...group,
    available: group.calendars.filter(
      (calendar) =>
        calendar.name &&
        !syncedCalendars.some(
          (synced) => synced.calendarId === calendar.id && synced.accountId === group.accountId,
        ),
    ),
  }))
  const brokenGroups = groupsWithAvailability.filter((group) => group.error)
  const hasAnyAvailable = groupsWithAvailability.some((group) => group.available.length > 0)

  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 rounded-xl border border-border-default bg-surface-card px-4 py-4 transition-colors duration-base hover:border-border-strong sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-x-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-surface-raised border border-border-subtle">
        <GoogleCalendarIcon />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {t('integrations.googleCalendar.name')}
          </p>
        </div>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
          {t('integrations.googleCalendar.description')}
        </p>

        {connected ? (
          <div className="mt-3 max-w-sm space-y-2">
            {syncedCalendars.length > 0 ? (
              <>
                <p className="text-2xs text-caption">
                  {t('integrations.googleCalendar.calendarCount', {
                    count: syncedCalendars.length,
                    limit: limit === null ? t('billing.usage.unlimited') : limit,
                  })}
                </p>
                <div className="space-y-2.5">
                  {Array.from(syncedByAccount.entries()).map(([accountEmail, items]) => (
                    <div key={accountEmail || 'unknown'} className="space-y-1.5">
                      {accountEmail ? (
                        <p className="truncate text-2xs text-caption">{accountEmail}</p>
                      ) : null}
                      <ul className="space-y-1.5">
                        {items.map((calendar) => (
                          <li
                            key={calendar.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-raised px-3 py-1.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-foreground">
                                {calendar.calendarName ?? calendar.calendarId}
                              </p>
                              <p className="text-2xs text-caption">
                                {calendar.lastSyncedAt
                                  ? t('integrations.googleCalendar.lastSynced', {
                                      time: formatTimestampRelative(calendar.lastSyncedAt),
                                    })
                                  : t('integrations.googleCalendar.notSynced')}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label={t('integrations.googleCalendar.removeCalendar')}
                              disabled={isPending}
                              onClick={() => void handleRemoveCalendar(calendar.id)}
                              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors duration-base hover:bg-surface-overlay hover:text-foreground disabled:opacity-60"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {calendarsError ? (
              <p className="text-2xs text-muted-foreground">
                {t('integrations.googleCalendar.listFailed')}
              </p>
            ) : !atLimit && (isCalendarsLoading || hasAnyAvailable) ? (
              <Select value="" disabled={isPending} onValueChange={handleAddCalendar}>
                <SelectTrigger>
                  <SelectValue placeholder={t('integrations.googleCalendar.addCalendar')} />
                </SelectTrigger>
                <SelectContent>
                  {isCalendarsLoading ? (
                    <p className="px-2 py-1.5 text-2xs text-muted-foreground">
                      {t('integrations.googleCalendar.loadingCalendars')}
                    </p>
                  ) : (
                    groupsWithAvailability.map((group) =>
                      group.available.length > 0 ? (
                        <SelectGroup key={group.accountId}>
                          <SelectLabel>{group.accountEmail}</SelectLabel>
                          {group.available.map((calendar) => (
                            <SelectItem
                              key={`${group.accountId}:${calendar.id}`}
                              value={`${group.accountId}:${calendar.id}`}
                            >
                              {calendar.name || calendar.id}
                              {calendar.primary
                                ? ` (${t('integrations.googleCalendar.primary')})`
                                : ''}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null,
                    )
                  )}
                </SelectContent>
              </Select>
            ) : atLimit && plan !== 'aether' ? (
              <Link
                to="/settings/billing"
                search={{ success: false, canceled: false }}
                className="text-2xs text-primary hover:underline"
              >
                {t('integrations.googleCalendar.upgradeForMore')}
              </Link>
            ) : !atLimit && brokenGroups.length === 0 ? (
              <p className="text-2xs text-muted-foreground">
                {t('integrations.googleCalendar.noCalendarsFound')}
              </p>
            ) : null}

            {brokenGroups.map((group) => (
              <p key={group.accountId} className="text-2xs text-muted-foreground">
                {t('integrations.googleCalendar.accountUnavailable', { account: group.accountEmail })}{' '}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => void handleConnect()}
                  className="text-primary hover:underline disabled:opacity-60"
                >
                  {t('integrations.googleCalendar.reconnectAccount')}
                </button>
              </p>
            ))}

            {!atLimit ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => void handleConnect()}
                className="block text-2xs text-muted-foreground transition-colors duration-base hover:text-foreground disabled:opacity-60"
              >
                {t('integrations.googleCalendar.connectAnotherAccount')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3 sm:row-start-1 sm:justify-end">
        {connected ? (
          <>
            {syncLocked ? (
              <Badge variant="warning" size="pill" className="gap-1.5">
                {t('integrations.googleCalendar.syncPaused')}
              </Badge>
            ) : (
              <Badge variant="success" size="pill" className="gap-1.5">
                <StatusDot status="active" />
                {t('integrations.connected')}
              </Badge>
            )}
            {syncedCalendars.length > 0 && !syncLocked ? (
              <button
                type="button"
                disabled={isPending || isLoading}
                onClick={() => void handleSync()}
                className="min-h-9 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-base hover:border-border-default hover:text-foreground disabled:opacity-60 sm:min-h-8"
              >
                {t('integrations.googleCalendar.syncNow')}
              </button>
            ) : null}
            <button
              type="button"
              disabled={isPending || isLoading}
              onClick={() => void handleDisconnect()}
              className="min-h-9 rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-base hover:border-border-default hover:text-foreground disabled:opacity-60 sm:min-h-8"
            >
              {t('integrations.googleCalendar.disconnectAll')}
            </button>
          </>
        ) : syncLocked ? (
          <Link
            to="/settings/billing"
            search={{ success: false, canceled: false }}
            className="flex min-h-9 items-center rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-base hover:border-border-default hover:text-foreground sm:min-h-8"
          >
            {t('integrations.googleCalendar.upgradeRequired')}
          </Link>
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
