import { describe, expect, it, vi } from 'vitest'
import {
  applyCalendarEventResize,
  resolveCalendarView,
} from '@/components/calendar/calendar-view'

describe('resolveCalendarView', () => {
  it('restores a saved calendar view and ignores invalid values', () => {
    expect(resolveCalendarView('timeGridWeek', false)).toBe('timeGridWeek')
    expect(resolveCalendarView('unexpected', true)).toBe('timeGridDay')
  })

  it('persists a resized time-scoped event', async () => {
    const onMove = vi.fn().mockResolvedValue(undefined)
    const revert = vi.fn()

    await applyCalendarEventResize(
      {
        event: {
          id: 'event-1',
          allDay: false,
          start: new Date('2026-08-09T09:00:00.000Z'),
          end: new Date('2026-08-09T11:00:00.000Z'),
          extendedProps: { source: 'native' },
        },
        revert,
      },
      onMove,
    )

    expect(onMove).toHaveBeenCalledWith('event-1', {
      allDay: false,
      startDate: null,
      endDate: null,
      startAt: '2026-08-09T09:00:00.000Z',
      endAt: '2026-08-09T11:00:00.000Z',
    })
    expect(revert).not.toHaveBeenCalled()
  })
})
