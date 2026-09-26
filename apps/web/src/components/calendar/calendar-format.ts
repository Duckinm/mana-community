import { formatMonthYear } from '@/lib/calendar-date'

export function formatCalendarMonthYear(
  date: Date,
  language: string,
): string {
  return formatMonthYear(date, language)
}

/** Single-character weekday for calendar column headers (S M T … / อา จ อ …). */
export function formatCalendarWeekdayLetter(
  date: Date,
  language: string,
): string {
  const locale = language.startsWith('th') ? 'th' : 'en'
  return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date)
}

/** Compact month/day for week-view header second line. */
export function formatCalendarHeaderDate(
  date: Date,
  language: string,
): string {
  const locale = language.startsWith('th') ? 'th' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}
