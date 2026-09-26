import { format, formatDistanceToNow, isSameDay, isValid, subDays } from 'date-fns'
import { enUS, th } from 'date-fns/locale'
import i18next from '@/lib/i18n'
import {
  preferredDatePattern,
  preferredTimePattern,
  preferredTimeZone,
  withPreferredCalendarYear,
} from '@/lib/date-time-preferences'

const DATE_FNS_LOCALES = { en: enUS, th } as const

function activeLocale() {
  return DATE_FNS_LOCALES[i18next.language as keyof typeof DATE_FNS_LOCALES] ?? enUS
}

function formatPreferred(date: Date, pattern: string): string {
  return format(date, withPreferredCalendarYear(pattern, date), { locale: activeLocale() })
}

/** Shown when a timestamp is missing or unparseable. */
export const EMPTY_TIMESTAMP_LABEL = '—' as const

/**
 * Parse an ISO timestamp (createdAt, updatedAt, etc.).
 * Use calendar-date helpers for YYYY-MM-DD fields instead.
 */
export function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return null
    const d = new Date(s)
    return isValid(d) ? d : null
  }
  return null
}

export function timestampToISO(value: unknown): string {
  const d = parseTimestamp(value)
  if (d) return d.toISOString()
  if (typeof value === 'string') return value
  return String(value)
}

function inPreferredTimeZone(date: Date): Date {
  const timeZone = preferredTimeZone()
  if (!timeZone) return date
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return new Date(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(value.hour),
    Number(value.minute),
    Number(value.second),
  )
}

export function formatTimestamp(
  value: unknown,
  pattern?: string,
  emptyLabel: string = EMPTY_TIMESTAMP_LABEL,
): string {
  const d = parseTimestamp(value)
  if (!d) return emptyLabel
  const zoned = inPreferredTimeZone(d)
  return formatPreferred(
    zoned,
    pattern ?? `${preferredDatePattern()} · ${preferredTimePattern()}`,
  )
}

export function formatTimestampTime(
  value: unknown,
  emptyLabel: string = EMPTY_TIMESTAMP_LABEL,
): string {
  const d = parseTimestamp(value)
  if (!d) return emptyLabel
  return format(inPreferredTimeZone(d), preferredTimePattern(), { locale: activeLocale() })
}

/** Relative upload / activity time (today / yesterday / absolute). */
export function formatTimestampRelative(value: unknown): string {
  const d = parseTimestamp(value)
  if (!d) return EMPTY_TIMESTAMP_LABEL

  const zoned = inPreferredTimeZone(d)
  const today = inPreferredTimeZone(new Date())
  const time = format(zoned, preferredTimePattern(), { locale: activeLocale() })
  if (isSameDay(zoned, today)) return i18next.t('relativeTime.todayAt', { ns: 'common', time })
  if (isSameDay(zoned, subDays(today, 1))) {
    return i18next.t('relativeTime.yesterdayAt', { ns: 'common', time })
  }
  return formatPreferred(
    zoned,
    `${preferredDatePattern()} · ${preferredTimePattern()}`,
  )
}

/** "11 days ago" style relative time, localized to the active i18next language. */
export function formatTimestampDistance(value: unknown, options?: { includeSeconds?: boolean }): string {
  const d = parseTimestamp(value)
  if (!d) return EMPTY_TIMESTAMP_LABEL
  return formatDistanceToNow(d, { addSuffix: true, includeSeconds: options?.includeSeconds, locale: activeLocale() })
}
