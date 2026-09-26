import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Bell, Globe, Mail, MessageSquare } from '@/components/icons'
import {
  NOTIFICATION_CHANNELS,
  notificationPreferenceKey,
  type NotificationChannel,
  type NotificationEvent,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from '@/lib/notification-preferences'

const SUPPORTED_CHANNELS: Record<NotificationEvent, readonly NotificationChannel[]> = {
  quotationViewed: ['inApp', 'email', 'push', 'line'],
  quotationAccepted: ['inApp', 'email', 'push', 'line'],
  quotationRejected: ['inApp', 'email', 'push', 'line'],
  quotationExpiring: [],
  quotationDeliveryFailed: ['email'],
  invoiceViewed: ['inApp', 'email', 'push', 'line'],
  invoiceDueSoon: [],
  invoiceOverdue: [],
  invoiceReminderSent: ['inApp', 'push'],
  invoicePaymentReceived: ['inApp', 'push'],
  invoiceDeliveryFailed: ['email'],
  receiptGenerated: [],
  receiptViewed: ['inApp', 'email', 'push', 'line'],
  receiptDeliveryFailed: ['email'],
  recurringDraftReady: ['email', 'line'],
  taskDeadline: [],
  calendarReminder: ['inApp', 'email', 'push'],
  budgetApproaching: ['inApp', 'email', 'push'],
  budgetExceeded: ['inApp', 'email', 'push'],
  weeklySummary: [],
  aiResponseCompleted: [],
  aiNeedsInput: [],
  contactAdded: ['inApp', 'push'],
  receiptReview: ['inApp', 'push'],
  reconciliationAttention: ['inApp', 'push'],
  paymentSlipAttention: ['inApp', 'push'],
}

export interface NotificationEventOption {
  key: NotificationEvent
  label: string
  description: string
}

export interface NotificationGroup {
  key: string
  title: string
  description: string
  events: NotificationEventOption[]
}

interface NotificationPreferenceMatrixProps {
  groups: NotificationGroup[]
  eventLabel: string
  channelLabels: Record<NotificationChannel, string>
  preferences: NotificationPreferences
  soonLabel: string
  onChange: (key: NotificationPreferenceKey, checked: boolean) => void
  /** Channels whose integration is not connected yet — shown but not editable. */
  lockedChannels?: readonly NotificationChannel[]
  lockedHint?: string
}

const CHANNEL_ICONS: Record<NotificationChannel, ComponentType<{ size?: number; className?: string }>> = {
  inApp: Bell,
  email: Mail,
  push: Globe,
  line: MessageSquare,
}

// Shared between the header and every event row so channel columns line up at every width —
// the tablet table pattern (shared channel header + toggles) now runs all the way down to phone.
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_repeat(4,2.75rem)] items-center gap-2 px-3 sm:grid-cols-[minmax(12rem,1fr)_repeat(4,minmax(3.75rem,4.5rem))] sm:gap-3 sm:px-4'

export function NotificationPreferenceMatrix({
  groups,
  eventLabel,
  channelLabels,
  preferences,
  soonLabel,
  onChange,
  lockedChannels = [],
  lockedHint,
}: NotificationPreferenceMatrixProps) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`notification-group-${group.key}`}>
          <div className="mb-2.5">
            <h3
              id={`notification-group-${group.key}`}
              className="text-sm font-semibold text-foreground"
            >
              {group.title}
            </h3>
            <p className="mt-0.5 text-xs text-caption">{group.description}</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card">
            <div
              className={`${ROW_GRID} sticky top-0 z-10 border-b border-border-default bg-surface-overlay py-2`}
            >
              <span className="text-xs font-semibold text-muted-foreground">
                {eventLabel}
              </span>
              {NOTIFICATION_CHANNELS.map((channel) => {
                const Icon = CHANNEL_ICONS[channel]
                return (
                  <span
                    key={channel}
                    data-channel-header={channel}
                    className="flex items-center justify-center text-center text-xs font-semibold text-muted-foreground"
                  >
                    <Icon size={14} className="shrink-0 sm:hidden" />
                    <span className="hidden sm:inline">{channelLabels[channel]}</span>
                    <span className="sr-only sm:hidden">{channelLabels[channel]}</span>
                  </span>
                )
              })}
            </div>

            <div className="divide-y divide-border-subtle">
              {group.events.map((event) => {
                const supportedChannels = SUPPORTED_CHANNELS[event.key]
                const planned = supportedChannels.length === 0

                if (planned) {
                  return (
                    <div
                      key={event.key}
                      className="flex items-center justify-between gap-2 px-3 py-2 opacity-60 sm:px-4"
                    >
                      <p className="truncate text-xs text-muted-foreground">{event.label}</p>
                      <Badge variant="muted" size="sm" className="shrink-0">
                        {soonLabel}
                      </Badge>
                    </div>
                  )
                }

                return (
                  <div key={event.key} className={`${ROW_GRID} py-2.5`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{event.label}</p>
                      <p className="mt-0.5 max-w-[65ch] text-xs leading-relaxed text-caption">
                        {event.description}
                      </p>
                    </div>

                    {NOTIFICATION_CHANNELS.map((channel) => {
                      const supported = supportedChannels.includes(channel)
                      const locked = lockedChannels.includes(channel)
                      const preferenceKey = notificationPreferenceKey(event.key, channel)

                      return (
                        <div key={channel} className="flex items-center justify-center">
                          {supported ? (
                            <label
                              title={locked ? lockedHint : undefined}
                              className={`flex min-h-11 min-w-11 items-center justify-center ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <Switch
                                size="sm"
                                disabled={locked}
                                checked={preferences[preferenceKey] ?? false}
                                onCheckedChange={(checked) => onChange(preferenceKey, checked)}
                                aria-label={
                                  locked && lockedHint
                                    ? `${event.label} — ${channelLabels[channel]} (${lockedHint})`
                                    : `${event.label} — ${channelLabels[channel]}`
                                }
                              />
                            </label>
                          ) : (
                            <span aria-hidden className="text-xs text-caption">
                              —
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
