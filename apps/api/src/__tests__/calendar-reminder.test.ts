import { describe, expect, it } from 'bun:test'
import {
  expandOccurrences,
  reminderReferenceId,
  shouldSendReminder,
} from '@api/lib/calendar-reminder'
import { buildCalendarReminderEmailHtml } from '@api/utils/email/calendar-reminder-email'
import type { calendarEvents } from '@mana/db'

function makeEvent(
  overrides: Partial<typeof calendarEvents.$inferSelect> = {},
): typeof calendarEvents.$inferSelect {
  const now = new Date()
  return {
    id: 'evt-1',
    userId: 'user-1',
    title: 'Standup',
    allDay: false,
    startDate: null,
    endDate: null,
    startAt: new Date('2026-06-28T10:00:00'),
    endAt: new Date('2026-06-28T10:30:00'),
    timeZone: 'UTC',
    rrule: null,
    exdates: '[]',
    alertMinutes: [15],
    contactId: null,
    note: 'Review blockers',
    location: 'Zoom',
    source: 'native',
    externalId: null,
    recurringEventId: null,
    originalStartAt: null,
    calendarConnectionId: null,
    syncToGoogle: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('shouldSendReminder', () => {
  it('fires when now is within the alert window before start', () => {
    const start = new Date('2026-06-28T10:00:00')
    const now = new Date('2026-06-28T09:50:00')
    expect(shouldSendReminder(now, start, 15)).toBe(true)
  })

  it('does not fire before the alert window opens', () => {
    const start = new Date('2026-06-28T10:00:00')
    const now = new Date('2026-06-28T09:40:00')
    expect(shouldSendReminder(now, start, 15)).toBe(false)
  })

  it('does not fire after the event starts', () => {
    const start = new Date('2026-06-28T10:00:00')
    const now = new Date('2026-06-28T10:05:00')
    expect(shouldSendReminder(now, start, 15)).toBe(false)
  })

  it('fires an at-time alert within the grace window after start', () => {
    const start = new Date('2026-06-28T10:00:00')
    expect(shouldSendReminder(new Date('2026-06-28T10:02:00'), start, 0)).toBe(true)
    expect(shouldSendReminder(new Date('2026-06-28T09:59:00'), start, 0)).toBe(false)
    expect(shouldSendReminder(new Date('2026-06-28T10:06:00'), start, 0)).toBe(false)
  })
})

describe('reminderReferenceId', () => {
  it('combines event id, instance key, and alert minutes', () => {
    expect(reminderReferenceId('evt-1', '2026-06-28T10:00:00.000Z', 15)).toBe(
      'evt-1|2026-06-28T10:00:00.000Z|15',
    )
  })
})

describe('expandOccurrences', () => {
  it('returns a single occurrence for non-recurring events', () => {
    const event = makeEvent()
    const start = new Date('2026-06-28T09:00:00')
    const end = new Date('2026-06-28T12:00:00')
    const occurrences = expandOccurrences(event, start, end)
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0]?.eventId).toBe('evt-1')
  })

  it('skips exdates on recurring masters', () => {
    const event = makeEvent({
      rrule: 'FREQ=DAILY;INTERVAL=1',
      startAt: new Date('2026-06-28T10:00:00'),
      exdates: JSON.stringify(['2026-06-29']),
      allDay: true,
      startDate: '2026-06-28',
      endDate: '2026-06-28',
    })
    const rangeStart = new Date('2026-06-28T00:00:00')
    const rangeEnd = new Date('2026-06-30T00:00:00')
    const occurrences = expandOccurrences(event, rangeStart, rangeEnd)
    const keys = occurrences.map((item) => item.instanceKey)
    expect(keys).not.toContain('2026-06-29')
  })
})

describe('buildCalendarReminderEmailHtml', () => {
  it('includes title, time, location, note, and attendee', async () => {
    const event = makeEvent()
    const { subject, html } = await buildCalendarReminderEmailHtml({
      event,
      occurrence: {
        eventId: event.id,
        instanceStart: event.startAt!,
        instanceKey: '2026-06-28T10:00:00.000Z',
      },
      ownerName: 'Jane',
      attendeeName: 'Acme Co',
    })

    expect(subject).toBe('Reminder: Standup')
    expect(html).toContain('Standup')
    expect(html).toContain('Zoom')
    expect(html).toContain('Review blockers')
    expect(html).toContain('Acme Co')
  })
})
