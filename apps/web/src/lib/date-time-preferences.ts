import type { UserPrefs } from '@/lib/user-types'

export type Region = NonNullable<UserPrefs['region']>
export type DateFormat = UserPrefs['dateFormat']
export type TimeFormat = UserPrefs['timeFormat']
export type CalendarSystem = 'buddhist' | 'gregory'

const defaults = {
  region: 'US' as Region,
  dateFormat: 'regional' as DateFormat,
  timeFormat: 'regional' as TimeFormat,
  timezone: null as UserPrefs['timezone'],
}

let preferences = defaults

export function inferBrowserTimeZone(): string | null {
  if (typeof Intl === 'undefined') return null
  return Intl.DateTimeFormat().resolvedOptions().timeZone || null
}

export function inferBrowserRegion(
  languages = typeof navigator === 'undefined'
    ? []
    : navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language],
  timeZone = inferBrowserTimeZone(),
): Region {
  // Timezone before language: a Bangkok freelancer reading the app in English still
  // wants Thai dates, and en-US says nothing about where they are.
  if (timeZone?.startsWith('Asia/Bangkok')) return 'TH'
  const language = languages[0]
  if (!language) return 'US'
  const locale = new Intl.Locale(language)
  return locale.region === 'TH' || (!locale.region && locale.language === 'th') ? 'TH' : 'US'
}

export function syncDateTimePreferences(
  user: Pick<UserPrefs, 'region' | 'dateFormat' | 'timeFormat'> &
    Partial<Pick<UserPrefs, 'timezone'>>,
) {
  preferences = {
    region: user.region ?? inferBrowserRegion(),
    dateFormat: user.dateFormat,
    timeFormat: user.timeFormat,
    timezone: user.timezone ?? null,
  }
}

export function resolveDateFormat(
  region = preferences.region,
  format = preferences.dateFormat,
): Exclude<DateFormat, 'regional'> {
  return format === 'regional' ? (region === 'TH' ? 'dmy' : 'mdy') : format
}

export function resolveTimeFormat(
  region = preferences.region,
  format = preferences.timeFormat,
): Exclude<TimeFormat, 'regional'> {
  return format === 'regional' ? (region === 'TH' ? 'h24' : 'h12') : format
}

export function resolveCalendar(region = preferences.region): CalendarSystem {
  return region === 'TH' ? 'buddhist' : 'gregory'
}

export function withPreferredCalendarYear(pattern: string, date: Date): string {
  const calendar = resolveCalendar()
  if (calendar === 'gregory' || !pattern.includes('yyyy')) return pattern

  const year = new Intl.DateTimeFormat('en-US', {
    calendar,
    numberingSystem: 'latn',
    year: 'numeric',
  }).formatToParts(date).find((part) => part.type === 'year')?.value

  return year ? pattern.replaceAll('yyyy', `'${year}'`) : pattern
}

export function preferredDatePattern(short = false): string {
  if (resolveDateFormat() === 'dmy') return short ? 'dd/MM' : 'dd/MM/yyyy'
  return short ? 'MM/dd' : 'MM/dd/yyyy'
}

export function preferredTimePattern(): string {
  return resolveTimeFormat() === 'h24' ? 'HH:mm' : 'h:mm a'
}

export function preferredTimeZone(): string | undefined {
  return preferences.timezone || undefined
}
