import { afterEach, describe, expect, it } from 'vitest'
import {
  formatCalendarHeaderDate,
  formatCalendarMonthYear,
  formatCalendarWeekdayLetter,
} from '@/components/calendar/calendar-format'
import { syncDateTimePreferences } from '@/lib/date-time-preferences'

describe('formatCalendarMonthYear', () => {
  afterEach(() => {
    syncDateTimePreferences({ region: 'US', dateFormat: 'regional', timeFormat: 'regional' })
  })

  it('uses Buddhist Era years for Thailand independently of language', () => {
    syncDateTimePreferences({ region: 'TH', dateFormat: 'regional', timeFormat: 'regional' })
    const value = formatCalendarMonthYear(new Date(2026, 6, 1), 'en')

    expect(value).toContain('2569')
    expect(value).not.toContain('2026')
  })

  it('keeps Gregorian years for the US when the interface language is Thai', () => {
    const value = formatCalendarMonthYear(new Date(2026, 6, 1), 'th')

    expect(value).toContain('2026')
    expect(value).not.toContain('2569')
  })
})

describe('formatCalendarWeekdayLetter', () => {
  it('returns a single English narrow weekday letter', () => {
    expect(formatCalendarWeekdayLetter(new Date(2026, 6, 19), 'en')).toBe('S')
    expect(formatCalendarWeekdayLetter(new Date(2026, 6, 20), 'en')).toBe('M')
  })

  it('returns Thai narrow weekday initials', () => {
    expect(formatCalendarWeekdayLetter(new Date(2026, 6, 20), 'th')).toBe('จ')
    expect(formatCalendarWeekdayLetter(new Date(2026, 6, 24), 'th')).toBe('ศ')
  })
})

describe('formatCalendarHeaderDate', () => {
  it('formats compact month/day', () => {
    expect(formatCalendarHeaderDate(new Date(2026, 6, 19), 'en')).toMatch(/7\/19|19\/7/)
  })
})
