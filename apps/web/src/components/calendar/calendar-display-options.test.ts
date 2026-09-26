import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CALENDAR_DISPLAY_OPTIONS,
  isCalendarEventVisible,
  isCalendarOverlayVisible,
} from '@/components/calendar/calendar-display-options'

describe('calendar display options', () => {
  it('filters each event and deadline category independently', () => {
    const options = { ...DEFAULT_CALENDAR_DISPLAY_OPTIONS, dueSoon: false, google: false }

    expect(isCalendarEventVisible({ source: 'google', accountEmail: null }, options)).toBe(false)
    expect(isCalendarEventVisible({ source: 'native', accountEmail: null }, options)).toBe(true)
    expect(
      isCalendarOverlayVisible(
        { kind: 'document', urgency: 'dueSoon', documentDateKind: 'invoiceDue' },
        options,
      ),
    ).toBe(false)
    expect(
      isCalendarOverlayVisible(
        { kind: 'document', urgency: 'overdue', documentDateKind: 'invoiceDue' },
        options,
      ),
    ).toBe(true)
  })
})
