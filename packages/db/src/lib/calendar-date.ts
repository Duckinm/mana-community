import { format, isValid, type Locale } from 'date-fns'
import { z } from 'zod'

/** Shown when a calendar date is missing or unparseable. */
export const EMPTY_DATE_LABEL = '—' as const

/** Strict YYYY-MM-DD (zero-padded). Use for URL search params, Zod, and API bodies. */
export const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const CALENDAR_DATE_PREFIX_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})/

export const optionalCalendarDateSchema = z
  .string()
  .regex(CALENDAR_DATE_RE)
  .optional()

export const nullableCalendarDateSchema = z.string().nullable()

/**
 * Parse a calendar date (YYYY-MM-DD) as local midnight — no UTC day shift.
 * Accepts Date instances and strings with an optional time suffix.
 */
export function parseCalendarDate(value: unknown): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (!s) return null
  const m = s.match(CALENDAR_DATE_PREFIX_RE)
  if (!m) return null
  const iso = `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`
  const date = new Date(`${iso}T00:00:00`)
  return isValid(date) ? date : null
}

/** Format a Date as YYYY-MM-DD using local calendar components (never use toISOString for this). */
export function toCalendarDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayCalendarDate(): string {
  return toCalendarDateString(new Date())
}

/** Current month as YYYY-MM (for prefix filters). */
export function currentCalendarMonthPrefix(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Coerce API/form values to YYYY-MM-DD or null.
 * Handles Date instances, padded/unpadded strings, and empty input.
 */
export function normalizeCalendarDateField(value: unknown): string | null {
  if (value == null || value === '') return null
  const parsed = parseCalendarDate(value)
  if (parsed) return toCalendarDateString(parsed)
  if (typeof value === 'string') {
    const s = value.trim()
    return s || null
  }
  return null
}

export function isEmptyDateLabel(label: string): boolean {
  return label === EMPTY_DATE_LABEL
}

/**
 * Format a calendar date for UI (transactions, documents, pickers).
 * Prefer this over calling date-fns `format` on raw strings at call sites.
 */
export function formatCalendarDate(
  value: unknown,
  pattern = 'MMM d, yyyy',
  emptyLabel: string = EMPTY_DATE_LABEL,
  locale?: Locale,
): string {
  const options = locale ? { locale } : undefined
  if (value instanceof Date && isValid(value)) {
    return format(value, pattern, options)
  }
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return emptyLabel
    try {
      return format(s, pattern, options)
    } catch {
      // fall through to local-midnight parse
    }
  }
  const d = parseCalendarDate(value)
  if (!d) return emptyLabel
  return format(d, pattern, options)
}

export function addCalendarDays(dateStr: string, days: number): string {
  const base = parseCalendarDate(dateStr)
  if (!base) return dateStr
  return toCalendarDateString(
    new Date(base.getFullYear(), base.getMonth(), base.getDate() + days),
  )
}

export function addCalendarMonths(dateStr: string, months: number): string {
  const base = parseCalendarDate(dateStr)
  if (!base) return dateStr
  return toCalendarDateString(
    new Date(base.getFullYear(), base.getMonth() + months, base.getDate()),
  )
}

export function calendarDateFromPicker(d: Date | undefined): string | undefined {
  return d ? toCalendarDateString(d) : undefined
}

export function calendarDateToPicker(
  value: string | undefined | null,
): Date | undefined {
  return parseCalendarDate(value) ?? undefined
}

/** Strip time from a timestamp Date for MCP / display payloads. */
export function calendarDateFromTimestamp(date: Date | string): string {
  return toCalendarDateString(typeof date === 'string' ? new Date(date) : date)
}

export function calendarDateDaysFromToday(days: number): string {
  return addCalendarDays(todayCalendarDate(), days)
}
