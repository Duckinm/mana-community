import { describe, expect, it } from 'bun:test'
import {
  addExdate,
  allDaySpan,
  continuationRrule,
  instanceKey,
  parseExdates,
  parseInstanceStart,
  seriesDurationMs,
  serializeExdates,
  truncateRruleBefore,
  validateRrule,
} from '@api/lib/calendar-recurrence'

describe('parseExdates / serializeExdates', () => {
  it('returns empty array for null or invalid JSON', () => {
    expect(parseExdates(null)).toEqual([])
    expect(parseExdates('not-json')).toEqual([])
  })

  it('filters non-string entries', () => {
    expect(parseExdates(JSON.stringify(['2026-06-01', 42, null]))).toEqual(['2026-06-01'])
  })

  it('deduplicates and sorts on serialize', () => {
    expect(serializeExdates(['2026-06-02', '2026-06-01', '2026-06-02'])).toBe(
      JSON.stringify(['2026-06-01', '2026-06-02']),
    )
  })
})

describe('instanceKey', () => {
  it('uses date-only key for all-day events', () => {
    const at = new Date('2026-06-15T00:00:00')
    expect(instanceKey(true, at)).toBe('2026-06-15')
  })

  it('uses ISO timestamp for timed events', () => {
    const at = new Date('2026-06-15T14:30:00')
    expect(instanceKey(false, at)).toBe(at.toISOString())
  })

  it('round-trips an all-day instance start east of UTC', () => {
    expect(instanceKey(true, parseInstanceStart(true, '2026-08-05'))).toBe('2026-08-05')
  })
})

describe('addExdate', () => {
  it('appends and deduplicates exdates', () => {
    expect(addExdate(['2026-06-01'], '2026-06-01')).toEqual(['2026-06-01'])
    expect(addExdate(['2026-06-01'], '2026-06-02')).toEqual(['2026-06-01', '2026-06-02'])
  })
})

describe('validateRrule', () => {
  it('accepts a valid weekly rule', () => {
    const dtstart = new Date('2026-06-02T09:00:00')
    expect(() => validateRrule('FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=1', dtstart)).not.toThrow()
  })

  it('rejects invalid RRULE', () => {
    const dtstart = new Date('2026-06-02T09:00:00')
    expect(() => validateRrule('NOT_A_RULE', dtstart)).toThrow()
  })
})

describe('truncateRruleBefore', () => {
  it('sets UNTIL to one millisecond before the cutoff', () => {
    const dtstart = new Date('2026-06-02T09:00:00')
    const before = new Date('2026-06-16T09:00:00')
    const truncated = truncateRruleBefore('FREQ=WEEKLY;BYDAY=MO;INTERVAL=1', dtstart, before)
    expect(truncated).toContain('UNTIL=')
    expect(truncated).not.toContain('COUNT=')
  })
})

describe('allDaySpan', () => {
  it('carries a series’ day span onto a split-off occurrence', () => {
    const series = {
      allDay: true,
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      startAt: null,
      endAt: null,
    }
    expect(allDaySpan(seriesDurationMs(series))).toBe(2)
  })

  it('treats a single-day series as no extra days', () => {
    expect(allDaySpan(86400000)).toBe(0)
    expect(allDaySpan(0)).toBe(0)
  })
})

describe('continuationRrule', () => {
  it('preserves frequency and interval with a new dtstart', () => {
    const previous = new Date('2026-06-02T09:00:00')
    const next = new Date('2026-06-16T09:00:00')
    const continued = continuationRrule('FREQ=WEEKLY;BYDAY=MO;INTERVAL=2', previous, next)
    expect(continued).toContain('FREQ=WEEKLY')
    expect(continued).toContain('INTERVAL=2')
    expect(continued).toContain('BYDAY=MO')
  })
})
