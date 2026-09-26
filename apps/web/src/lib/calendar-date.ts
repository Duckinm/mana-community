import { enUS, th } from 'date-fns/locale'
import i18next from '@/lib/i18n'
import {
  preferredDatePattern,
  resolveCalendar,
  withPreferredCalendarYear,
} from '@/lib/date-time-preferences'
import {
  formatCalendarDate as formatCalendarDateBase,
  parseCalendarDate as parseCalendarDateBase,
} from '@mana/db/calendar-date'

export {
  EMPTY_DATE_LABEL,
  CALENDAR_DATE_RE,
  optionalCalendarDateSchema,
  nullableCalendarDateSchema,
  parseCalendarDate,
  toCalendarDateString,
  todayCalendarDate,
  currentCalendarMonthPrefix,
  normalizeCalendarDateField,
  isEmptyDateLabel,
  addCalendarDays,
  calendarDateFromPicker,
  calendarDateToPicker,
  calendarDateFromTimestamp,
  calendarDateDaysFromToday,
} from '@mana/db/calendar-date'

const DATE_FNS_LOCALES = { en: enUS, th } as const

/** Formats using the active i18next language's date-fns locale (month/day names) — call sites never pass a locale. */
export function formatCalendarDate(
  value: unknown,
  pattern?: string,
  emptyLabel?: string,
): string {
  const locale = DATE_FNS_LOCALES[i18next.language as keyof typeof DATE_FNS_LOCALES] ?? enUS
  const datePattern = pattern ?? preferredDatePattern()
  const date = parseCalendarDateBase(value)
  return formatCalendarDateBase(
    value,
    date ? withPreferredCalendarYear(datePattern, date) : datePattern,
    emptyLabel,
    locale,
  )
}

/** Day + short month for compact labels, ordered per language — Thai reads the day first. */
export function formatCalendarDateShort(value: unknown): string {
  return formatCalendarDate(value, i18next.language === 'th' ? 'd MMM' : 'MMM d')
}

export function formatMonthYear(
  date: Date,
  language: string,
  options: {
    month?: 'short' | 'long'
    year?: '2-digit' | 'numeric'
  } = {},
): string {
  return new Intl.DateTimeFormat(language, {
    calendar: resolveCalendar(),
    numberingSystem: 'latn',
    month: options.month ?? 'long',
    year: options.year ?? 'numeric',
  }).format(date)
}
