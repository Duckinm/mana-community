import { afterEach, describe, expect, it } from 'vitest'
import i18next from '@/lib/i18n'
import { formatCalendarDate } from '@/lib/calendar-date'
import { syncDateTimePreferences } from '@/lib/date-time-preferences'

describe('formatCalendarDate', () => {
  afterEach(async () => {
    syncDateTimePreferences({ region: 'US', dateFormat: 'regional', timeFormat: 'regional' })
    await i18next.changeLanguage('en')
  })

  it('uses the calendar and date order from region independently of language', async () => {
    await i18next.changeLanguage('th')
    syncDateTimePreferences({ region: 'US', dateFormat: 'regional', timeFormat: 'regional' })

    expect(formatCalendarDate('2026-07-03')).toBe('07/03/2026')

    await i18next.changeLanguage('en')
    syncDateTimePreferences({ region: 'TH', dateFormat: 'regional', timeFormat: 'regional' })

    expect(formatCalendarDate('2026-07-03')).toBe('03/07/2569')
  })

  it('keeps Buddhist Era years when the date order is overridden', () => {
    syncDateTimePreferences({ region: 'TH', dateFormat: 'mdy', timeFormat: 'regional' })

    expect(formatCalendarDate('2026-07-03')).toBe('07/03/2569')
    expect(formatCalendarDate('2026-07-03', 'MMM d, yyyy')).toBe('Jul 3, 2569')
  })

  it('preserves explicit display patterns for compact layouts', async () => {
    await i18next.changeLanguage('th')

    expect(formatCalendarDate('2026-07-03', 'MMM d')).toBe('ก.ค. 3')
  })
})
