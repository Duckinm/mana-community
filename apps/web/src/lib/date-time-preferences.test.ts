import { afterEach, describe, expect, it } from 'vitest'
import {
  inferBrowserRegion,
  preferredDatePattern,
  preferredTimePattern,
  resolveCalendar,
  resolveDateFormat,
  resolveTimeFormat,
  syncDateTimePreferences,
} from '@/lib/date-time-preferences'

describe('date and time preferences', () => {
  afterEach(() => {
    syncDateTimePreferences({ region: 'US', dateFormat: 'regional', timeFormat: 'regional' })
  })

  // Timezone pinned to null throughout: left to the machine, these assertions flip
  // between a Bangkok laptop and a UTC CI runner.
  it('detects the region from the primary browser locale, not its language', () => {
    expect(inferBrowserRegion(['en-TH'], null)).toBe('TH')
    expect(inferBrowserRegion(['th-US'], null)).toBe('US')
    expect(inferBrowserRegion(['th'], null)).toBe('TH')
    expect(inferBrowserRegion(['en-GB'], null)).toBe('US')
  })

  it('prefers the timezone over the language: English reader, Bangkok desk', () => {
    expect(inferBrowserRegion(['en-US'], 'Asia/Bangkok')).toBe('TH')
    expect(inferBrowserRegion(['th-TH'], 'America/New_York')).toBe('TH')
    expect(inferBrowserRegion(['en-US'], 'America/New_York')).toBe('US')
    expect(inferBrowserRegion(['en-US'], null)).toBe('US')
  })

  it('resolves Thai and US regional defaults', () => {
    expect(resolveCalendar('TH')).toBe('buddhist')
    expect(resolveDateFormat('TH', 'regional')).toBe('dmy')
    expect(resolveTimeFormat('TH', 'regional')).toBe('h24')
    expect(resolveCalendar('US')).toBe('gregory')
    expect(resolveDateFormat('US', 'regional')).toBe('mdy')
    expect(resolveTimeFormat('US', 'regional')).toBe('h12')
  })

  it('keeps explicit overrides when region changes', () => {
    expect(resolveDateFormat('TH', 'mdy')).toBe('mdy')
    expect(resolveTimeFormat('US', 'h24')).toBe('h24')
  })

  it('provides date-fns patterns for shared formatters', () => {
    syncDateTimePreferences({ region: 'TH', dateFormat: 'regional', timeFormat: 'regional' })
    expect(preferredDatePattern()).toBe('dd/MM/yyyy')
    expect(preferredDatePattern(true)).toBe('dd/MM')
    expect(preferredTimePattern()).toBe('HH:mm')
  })
})
