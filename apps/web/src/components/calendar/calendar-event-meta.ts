import type { CalendarEvent, CalendarOverlay } from '@/components/calendar/types'
import { formatCalendarDate } from '@/lib/calendar-date'
import { formatTimestamp, formatTimestampTime } from '@/lib/timestamp'

export type CalendarItemKind = 'native' | 'google' | 'milestone' | 'document'

export function eventKind(event: CalendarEvent): CalendarItemKind {
  return event.source === 'google' ? 'google' : 'native'
}

export function overlayKind(overlay: CalendarOverlay): CalendarItemKind {
  return overlay.kind
}

export function kindLabelKey(kind: CalendarItemKind): string {
  switch (kind) {
    case 'google':
      return 'legend.google'
    case 'milestone':
      return 'legend.milestone'
    case 'document':
      return 'legend.document'
    default:
      return 'legend.native'
  }
}

export function overlaySignalLabelKey(overlay: CalendarOverlay): string | null {
  if (overlay.kind !== 'document') return null

  if (overlay.documentDateKind === 'invoiceDue') {
    if (overlay.urgency === 'overdue') return 'detail.documentSignal.invoiceOverdue'
    if (overlay.urgency === 'dueSoon') return 'detail.documentSignal.invoiceDueSoon'
    return 'detail.documentSignal.invoiceDue'
  }

  if (overlay.documentDateKind === 'quoteExpiry') {
    if (overlay.urgency === 'expired') return 'detail.documentSignal.quoteExpired'
    if (overlay.urgency === 'dueSoon') return 'detail.documentSignal.quoteExpiringSoon'
    return 'detail.documentSignal.quoteExpires'
  }

  if (overlay.documentDateKind === 'recurringGeneration') {
    return 'detail.documentSignal.recurringGeneration'
  }

  return null
}

export function kindBadgeVariant(
  kind: CalendarItemKind,
): 'default' | 'outline' | 'warning' | 'purple' {
  switch (kind) {
    case 'google':
      return 'outline'
    case 'milestone':
      return 'warning'
    case 'document':
      return 'purple'
    default:
      return 'default'
  }
}

export function formatEventSchedule(
  event: CalendarEvent,
  instanceStart?: string | null,
): string {
  if (event.allDay) {
    const start = instanceStart?.slice(0, 10) ?? event.startDate
    const end = event.endDate ?? event.startDate
    if (!start) return ''
    if (end && end !== start) {
      return `${formatCalendarDate(start)} – ${formatCalendarDate(end)}`
    }
    return formatCalendarDate(start)
  }

  const startIso = instanceStart ?? event.startAt
  if (!startIso) return ''
  const start = formatTimestamp(startIso)
  if (!event.endAt) return start
  return `${start} – ${formatTimestampTime(event.endAt)}`
}

export function formatOverlaySchedule(overlay: CalendarOverlay): string {
  return formatCalendarDate(overlay.date)
}

export function alertLabel(
  minutes: number[] | null,
  t: (key: 'form.alertMinutes', opts: { count: number }) => string,
): string | null {
  if (!minutes || minutes.length === 0) return null
  return minutes.map((m) => t('form.alertMinutes', { count: m })).join(', ')
}
