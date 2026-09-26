import { RRule, rrulestr, type Options } from 'rrule'
import { toCalendarDateString } from '@api/lib/calendar-date'

export type RecurrenceScope = 'single' | 'following' | 'all'

export function parseExdates(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function serializeExdates(dates: string[]): string {
  return JSON.stringify([...new Set(dates)].sort())
}

export function instanceKey(allDay: boolean, at: Date): string {
  // parseInstanceStart builds local midnight; toISOString would shift the day east of UTC.
  return allDay ? toCalendarDateString(at) : at.toISOString()
}

export function parseInstanceStart(allDay: boolean, value: string): Date {
  return allDay ? new Date(`${value}T00:00:00`) : new Date(value)
}

export function getSeriesStart(input: {
  allDay: boolean
  startDate: string | null
  startAt: Date | null
}): Date {
  if (input.allDay && input.startDate) {
    return new Date(`${input.startDate}T00:00:00`)
  }
  if (input.startAt) return input.startAt
  throw new Error('Event has no series start')
}

export function addExdate(exdates: string[], key: string): string[] {
  return [...new Set([...exdates, key])].sort()
}

function ruleOptions(rrule: string, dtstart: Date): Partial<Options> {
  return rrulestr(rrule, { dtstart }).origOptions
}

export function truncateRruleBefore(rrule: string, dtstart: Date, before: Date): string {
  const until = new Date(before.getTime() - 1)
  const options = ruleOptions(rrule, dtstart)
  return new RRule({ ...options, count: undefined, until })
    .toString()
    .replace(/^RRULE:/, '')
}

export function continuationRrule(
  rrule: string,
  previousDtstart: Date,
  nextDtstart: Date,
): string {
  const options = ruleOptions(rrule, previousDtstart)
  return new RRule({
    freq: options.freq,
    interval: options.interval,
    byweekday: options.byweekday,
    bymonthday: options.bymonthday,
    bymonth: options.bymonth,
    bysetpos: options.bysetpos,
    wkst: options.wkst,
    count: options.count,
    until: options.until,
    dtstart: nextDtstart,
  })
    .toString()
    .replace(/^RRULE:/, '')
}

export function validateRrule(rrule: string, dtstart: Date): void {
  rrulestr(rrule, { dtstart })
}

export function seriesDurationMs(input: {
  allDay: boolean
  startDate: string | null
  endDate: string | null
  startAt: Date | null
  endAt: Date | null
}): number {
  if (input.allDay && input.startDate) {
    const end = input.endDate ?? input.startDate
    const start = new Date(`${input.startDate}T00:00:00`)
    const endDay = new Date(`${end}T00:00:00`)
    return Math.max(endDay.getTime() - start.getTime() + 86400000, 86400000)
  }
  if (input.startAt && input.endAt) {
    return Math.max(input.endAt.getTime() - input.startAt.getTime(), 900000)
  }
  return 3600000
}

/** Days an all-day series runs past its start date; `seriesDurationMs` counts inclusively. */
export function allDaySpan(durationMs: number): number {
  return Math.max(0, Math.round(durationMs / 86400000) - 1)
}
