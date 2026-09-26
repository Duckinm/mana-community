import { Frequency, RRule, rrulestr } from 'rrule'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type RecurrenceFormValues = {
  enabled: boolean
  freq: RecurrenceFrequency
  interval: number
  until: string | null
  weekdays: number[]
}

const FREQ_MAP: Record<RecurrenceFormValues['freq'], Frequency> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
}

const WEEKDAY_STR_INDEX: Record<string, number> = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
}

function weekdayToIndex(day: number | { weekday: number } | string): number {
  if (typeof day === 'number') return day === 6 ? 6 : day
  if (typeof day === 'string') return WEEKDAY_STR_INDEX[day] ?? 0
  return day.weekday === 6 ? 6 : day.weekday
}

const WEEKDAY_BY_INDEX = [
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
  RRule.SU,
]

export function defaultRecurrenceFormValues(): RecurrenceFormValues {
  return {
    enabled: false,
    freq: 'weekly',
    interval: 1,
    until: null,
    weekdays: [0, 1, 2, 3, 4],
  }
}

export function formToRrule(
  values: RecurrenceFormValues,
  dtstart: Date,
): string | null {
  if (!values.enabled) return null

  const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
    freq: FREQ_MAP[values.freq],
    interval: Math.max(1, values.interval),
    dtstart,
    until: values.until ? new Date(`${values.until}T23:59:59`) : undefined,
  }

  if (values.freq === 'weekly' && values.weekdays.length > 0) {
    options.byweekday = values.weekdays.map((index) => WEEKDAY_BY_INDEX[index])
  }

  return new RRule(options).toString().replace(/^RRULE:/, '')
}

export function rruleToForm(
  rrule: string | null | undefined,
  dtstart: Date,
): RecurrenceFormValues {
  if (!rrule) return defaultRecurrenceFormValues()

  try {
    const rule = rrulestr(rrule, { dtstart })
    const options = rule.origOptions
    const freqEntry = Object.entries(FREQ_MAP).find(([, freq]) => freq === options.freq)
    const rawWeekdays = options.byweekday
    const byweekdayList = rawWeekdays == null
      ? []
      : Array.isArray(rawWeekdays)
        ? rawWeekdays
        : [rawWeekdays]
    const weekdays =
      byweekdayList.length > 0
        ? byweekdayList.map((day) => weekdayToIndex(day))
        : [0, 1, 2, 3, 4]

    return {
      enabled: true,
      freq: (freqEntry?.[0] as RecurrenceFrequency | undefined) ?? 'weekly',
      interval: options.interval ?? 1,
      until: options.until ? options.until.toISOString().slice(0, 10) : null,
      weekdays,
    }
  } catch {
    return defaultRecurrenceFormValues()
  }
}

export function eventDtstart(input: {
  allDay: boolean
  startDate: string
  startTime: string
}): Date {
  if (input.allDay) return new Date(`${input.startDate}T00:00:00`)
  return new Date(`${input.startDate}T${input.startTime}:00`)
}

export type RecurrenceScope = 'single' | 'following' | 'all'
