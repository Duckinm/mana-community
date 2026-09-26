import { describe, expect, it } from 'vitest'
import {
  fullCalendarDropToPatch,
  taskToFullCalendar,
} from '@/components/calendar/calendar-event-mapper'

describe('taskToFullCalendar', () => {
  it('renders a task with a due time as a timed 30-minute calendar block', () => {
    const event = taskToFullCalendar({
      id: 'task-1',
      title: 'Send proposal',
      projectId: 'project-1',
      date: '2026-08-09',
      time: '14:30',
    })

    expect(event).toMatchObject({ allDay: false, durationEditable: true, title: 'Send proposal' })
    expect(event.start).toBeInstanceOf(Date)
    expect(event.end).toBeInstanceOf(Date)
    expect((event.start as Date).getHours()).toBe(14)
    expect((event.start as Date).getMinutes()).toBe(30)
    expect((event.end as Date).getTime() - (event.start as Date).getTime()).toBe(30 * 60 * 1000)
  })

  it('uses a scheduled range over the due-time fallback and allows resizing', () => {
    const event = taskToFullCalendar({
      id: 'task-1',
      title: 'Build landing page',
      projectId: 'project-1',
      date: '2026-08-09',
      time: '14:30',
      scheduledStart: '2026-08-10T09:00:00.000Z',
      scheduledEnd: '2026-08-12T17:00:00.000Z',
    })

    expect(event).toMatchObject({ allDay: false, durationEditable: true })
    expect(event.start).toEqual(new Date('2026-08-10T09:00:00.000Z'))
    expect(event.end).toEqual(new Date('2026-08-12T17:00:00.000Z'))
  })

  it('makes an all-day event dropped into a time slot a one-hour event', () => {
    expect(
      fullCalendarDropToPatch({
        event: {
          allDay: false,
          start: new Date('2026-08-09T09:00:00.000Z'),
          end: null,
        },
      }),
    ).toEqual({
      allDay: false,
      startDate: null,
      endDate: null,
      startAt: '2026-08-09T09:00:00.000Z',
      endAt: '2026-08-09T10:00:00.000Z',
    })
  })
})
