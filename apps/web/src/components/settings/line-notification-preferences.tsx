import { useTranslation } from 'react-i18next'
import { Toggle } from '@/components/settings/shared'
import {
  LINE_NOTIFICATION_EVENTS,
  notificationPreferenceKey,
  type NotificationEvent,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from '@/lib/notification-preferences'

function eventGroup(key: NotificationEvent) {
  if (key.startsWith('quotation')) return 'quotation'
  if (key.startsWith('invoice')) return 'invoice'
  if (key.startsWith('receipt')) return 'receipt'
  return 'automation'
}

export function LineNotificationPreferences({
  preferences,
  onChange,
}: {
  preferences: NotificationPreferences
  onChange: (key: NotificationPreferenceKey, checked: boolean) => void
}) {
  const { t } = useTranslation('settings')

  return (
    <div className="border-t border-border-subtle pt-3">
      <p className="text-sm font-medium text-foreground">
        {t('integrations.line.notificationsTitle')}
      </p>
      <p className="mt-0.5 text-xs text-caption">
        {t('integrations.line.notificationsDescription')}
      </p>
      <div className="mt-2 divide-y divide-border-subtle">
        {LINE_NOTIFICATION_EVENTS.map((event) => {
          const preferenceKey = notificationPreferenceKey(event, 'line')
          const label = `${t(`notifications.groups.${eventGroup(event)}.title`)} — ${t(`notifications.events.${event}.label`)}`

          return (
            <div key={event} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-caption">
                  {t(`notifications.events.${event}.description`)}
                </p>
              </div>
              <Toggle
                on={preferences[preferenceKey] ?? false}
                onChange={(checked) => onChange(preferenceKey, checked)}
                ariaLabel={`LINE — ${label}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
