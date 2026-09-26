import { afterEach, describe, expect, it } from 'vitest'
import { syncDateTimePreferences } from '@/lib/date-time-preferences'
import { formatTimestamp } from '@/lib/timestamp'

describe('formatTimestamp', () => {
  afterEach(() => {
    syncDateTimePreferences({ region: 'US', dateFormat: 'regional', timeFormat: 'regional' })
  })

  it('uses the Thai regional date and 24-hour defaults', () => {
    syncDateTimePreferences({ region: 'TH', dateFormat: 'regional', timeFormat: 'regional' })
    expect(formatTimestamp(new Date(2026, 6, 3, 21, 5))).toBe('03/07/2569 · 21:05')
  })

  it('keeps explicit date and time overrides with the regional calendar', () => {
    syncDateTimePreferences({ region: 'TH', dateFormat: 'mdy', timeFormat: 'h12' })
    expect(formatTimestamp(new Date(2026, 6, 3, 21, 5))).toBe('07/03/2569 · 9:05 PM')
    expect(formatTimestamp(new Date(2026, 6, 3, 21, 5), 'MMM d, yyyy')).toBe('Jul 3, 2569')
  })

  it('applies the saved timezone before formatting a timestamp', () => {
    syncDateTimePreferences({
      region: 'TH',
      dateFormat: 'regional',
      timeFormat: 'regional',
      timezone: 'Asia/Bangkok',
    })

    expect(formatTimestamp('2026-07-03T18:30:00.000Z')).toBe('04/07/2569 · 01:30')
  })
})
