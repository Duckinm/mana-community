import { describe, expect, it } from 'vitest'
import { clampEndDate, endDateForStart } from '@/components/calendar/event-date-range'

describe('endDateForStart', () => {
  it('leaves the end alone while the start stays behind it', () => {
    expect(endDateForStart('2026-08-01', '2026-08-03', '2026-08-02')).toBe('2026-08-03')
  })

  it('drags the end along, preserving the span', () => {
    expect(endDateForStart('2026-08-01', '2026-08-03', '2026-08-05')).toBe('2026-08-07')
  })

  it('keeps a one-day event one day across a month boundary', () => {
    expect(endDateForStart('2026-08-31', '2026-08-31', '2026-09-01')).toBe('2026-09-01')
  })
})

describe('clampEndDate', () => {
  it('pulls an earlier end up to the start', () => {
    expect(clampEndDate('2026-08-05', '2026-08-01')).toBe('2026-08-05')
  })

  it('leaves a valid end alone', () => {
    expect(clampEndDate('2026-08-05', '2026-08-09')).toBe('2026-08-09')
  })
})
