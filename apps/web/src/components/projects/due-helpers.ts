import { formatCalendarDate, parseCalendarDate, toCalendarDateString } from '@/lib/calendar-date'

const DUE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** Safe for JSX text — API/client should only send strings, but PATCH once leaked Dates. */
export function coerceDueToString(due: unknown): string {
  if (due == null) return ''
  if (typeof due === 'string') return due
  if (due instanceof Date) {
    return `${DUE_MONTHS[due.getMonth()]} ${due.getDate()}`
  }
  return String(due)
}

/** Overdue check for overview stat — supports "Jan 15", YYYY-MM-DD, empty. */
export function isTaskOverdueByDueField(due: unknown, status: string): boolean {
  if (status === 'done') return false
  const raw = coerceDueToString(due).trim()
  if (!raw) return false

  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const month = DUE_MONTHS.indexOf(parts[0] as (typeof DUE_MONTHS)[number])
    if (month >= 0) {
      const day = parseInt(parts[1], 10)
      if (Number.isFinite(day)) {
        const d = new Date(2024, month, day)
        return d < new Date() && status !== 'done'
      }
    }
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (ymd) {
    const d = new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    return d < today
  }

  return false
}

/** Table / detail — parse display or ISO due into a Date (local). */
export function parseDueValue(str: string | undefined | unknown): Date | undefined {
  if (str == null) return undefined
  const s = typeof str === 'string' ? str : coerceDueToString(str)
  if (!s.trim()) return undefined

  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (ymd) {
    return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10))
  }

  const fromIso = parseCalendarDate(s)
  if (fromIso) return fromIso

  const [mon, day] = s.trim().split(/\s+/)
  const m = DUE_MONTHS.indexOf(mon as (typeof DUE_MONTHS)[number])
  if (m === -1 || !day) return undefined
  return new Date(new Date().getFullYear(), m, parseInt(day, 10))
}

export function formatDueLabel(date: Date): string {
  return toCalendarDateString(date)
}

/** Locale-aware display for task due (board, table, detail). */
export function formatTaskDueDisplay(due: unknown, pattern = 'MMM d'): string {
  if (due instanceof Date && !Number.isNaN(due.getTime())) {
    return formatCalendarDate(due, pattern)
  }
  const parsed = parseDueValue(due)
  if (parsed) return formatCalendarDate(parsed, pattern)
  const raw = coerceDueToString(due).trim()
  if (!raw) return ''
  return raw
}

export type TaskDuePresetKey = 'tomorrow' | 'endOfWeek' | 'inOneWeek' | 'endOfNextCycle'

export const TASK_DUE_PRESET_KEYS: TaskDuePresetKey[] = [
  'tomorrow',
  'endOfWeek',
  'inOneWeek',
  'endOfNextCycle',
]

function localMidnight(from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate())
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function fridayOfWeek(from: Date): Date {
  const day = from.getDay()
  const daysUntilFriday = (5 - day + 7) % 7
  return addLocalDays(from, daysUntilFriday)
}

export function getTaskDuePresetDate(key: TaskDuePresetKey, from = new Date()): Date {
  const today = localMidnight(from)
  switch (key) {
    case 'tomorrow':
      return addLocalDays(today, 1)
    case 'endOfWeek':
      return fridayOfWeek(today)
    case 'inOneWeek':
      return addLocalDays(today, 7)
    case 'endOfNextCycle':
      return addLocalDays(fridayOfWeek(today), 14)
  }
}

export function isSameDueDay(a: Date | undefined, b: Date): boolean {
  if (!a) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export type TaskDueQuickKey = 'today' | 'tomorrow' | 'nextWeek'

export const TASK_DUE_QUICK_KEYS: TaskDueQuickKey[] = ['today', 'tomorrow', 'nextWeek']

export function getTaskDueQuickDate(key: TaskDueQuickKey, from = new Date()): Date {
  const today = localMidnight(from)
  switch (key) {
    case 'today':
      return today
    case 'tomorrow':
      return addLocalDays(today, 1)
    case 'nextWeek':
      return addLocalDays(today, 7)
  }
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function nextWeekday(target: number, from: Date, allowToday: boolean): Date {
  const today = localMidnight(from)
  const delta = (target - today.getDay() + 7) % 7
  const days = delta === 0 && !allowToday ? 7 : delta
  return addLocalDays(today, days)
}

/**
 * Loose natural-language due parser for the create-task quick input.
 * Returns a local date, or undefined when the text isn't a recognisable date phrase.
 */
export function parseDueNaturalLanguage(input: string, from = new Date()): Date | undefined {
  const text = input.trim().toLowerCase()
  if (!text) return undefined

  if (text === 'today') return getTaskDueQuickDate('today', from)
  if (text === 'tomorrow' || text === 'tmr' || text === 'tmrw') return getTaskDueQuickDate('tomorrow', from)
  if (text === 'next week') return getTaskDueQuickDate('nextWeek', from)
  if (text === 'end of week' || text === 'eow') return fridayOfWeek(localMidnight(from))

  const nextMatch = /^next\s+(\w+)$/.exec(text)
  if (nextMatch) {
    const idx = WEEKDAYS.findIndex((d) => nextMatch[1].startsWith(d))
    if (idx >= 0) return addLocalDays(nextWeekday(idx, from, false), 7)
  }

  const bareWeekday = WEEKDAYS.findIndex((d) => text.startsWith(d) && text.length <= 4)
  if (bareWeekday >= 0) return nextWeekday(bareWeekday, from, false)

  const inDays = /^in\s+(\d+)\s+days?$/.exec(text)
  if (inDays) return addLocalDays(localMidnight(from), parseInt(inDays[1], 10))

  return parseDueValue(input)
}
