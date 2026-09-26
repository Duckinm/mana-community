import { describe, expect, it } from 'bun:test'
import {
  calendarRowToGoogleEvent,
  fosEventIdFromGoogle,
  googleEventToInsertValues,
  googleOriginalStart,
} from '@api/lib/google-calendar/map-event'
import { parseInstanceStart } from '@api/lib/calendar-recurrence'
import type { calendarEvents } from '@mana/db'

const allDayRow: typeof calendarEvents.$inferSelect = {
  id: 'evt-1',
  userId: 'user-1',
  title: 'Trip',
  allDay: true,
  startDate: null,
  endDate: null,
  startAt: null,
  endAt: null,
  timeZone: 'UTC',
  rrule: null,
  exdates: '[]',
  alertMinutes: null,
  contactId: null,
  note: null,
  location: null,
  source: 'google',
  externalId: 'google-3',
  recurringEventId: null,
  originalStartAt: null,
  calendarConnectionId: null,
  syncToGoogle: true,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
}

describe('googleOriginalStart', () => {
  it('states an all-day occurrence as its calendar date east of UTC', () => {
    expect(googleOriginalStart(true, parseInstanceStart(true, '2026-08-05'))).toBe('2026-08-05')
  })

  it('states a timed occurrence as an instant', () => {
    const at = new Date('2026-08-05T09:00:00Z')
    expect(googleOriginalStart(false, at)).toBe('2026-08-05T09:00:00.000Z')
  })
})

describe('googleEventToInsertValues', () => {
  it('maps timed Google events', () => {
    const values = googleEventToInsertValues('user-1', {
      id: 'google-1',
      summary: 'Client call',
      description: 'Prep deck',
      location: 'Zoom',
      start: { dateTime: '2026-06-28T10:00:00.000Z', timeZone: 'UTC' },
      end: { dateTime: '2026-06-28T10:30:00.000Z', timeZone: 'UTC' },
    })

    expect(values?.title).toBe('Client call')
    expect(values?.source).toBe('google')
    expect(values?.externalId).toBe('google-1')
    expect(values?.allDay).toBe(false)
  })

  it('maps all-day Google events, storing the last day rather than the exclusive end', () => {
    const values = googleEventToInsertValues('user-1', {
      id: 'google-2',
      summary: 'Deadline',
      start: { date: '2026-06-28' },
      end: { date: '2026-06-29' },
    })

    expect(values?.allDay).toBe(true)
    expect(values?.startDate).toBe('2026-06-28')
    expect(values?.endDate).toBe('2026-06-28')
  })
})

describe('all-day end round trip', () => {
  it('restores Google’s exclusive end on push', () => {
    const google = { id: 'google-3', summary: 'Trip', start: { date: '2026-06-28' }, end: { date: '2026-07-01' } }
    const stored = googleEventToInsertValues('user-1', google)
    const pushed = calendarRowToGoogleEvent({
      ...allDayRow,
      startDate: stored?.startDate ?? null,
      endDate: stored?.endDate ?? null,
    })

    expect(pushed.start?.date).toBe(google.start.date)
    expect(pushed.end?.date).toBe(google.end.date)
  })

  it('gives a single-day event the non-empty range Google requires', () => {
    const pushed = calendarRowToGoogleEvent({
      ...allDayRow,
      startDate: '2026-06-28',
      endDate: '2026-06-28',
    })

    expect(pushed.end?.date).toBe('2026-06-29')
  })
})

describe('calendarRowToGoogleEvent', () => {
  it('embeds fosEventId in extended properties', () => {
    const payload = calendarRowToGoogleEvent({
      id: 'evt-1',
      userId: 'user-1',
      title: 'Standup',
      allDay: false,
      startDate: null,
      endDate: null,
      startAt: new Date('2026-06-28T10:00:00.000Z'),
      endAt: new Date('2026-06-28T10:30:00.000Z'),
      timeZone: 'UTC',
      rrule: null,
      exdates: '[]',
      alertMinutes: null,
      contactId: null,
      note: null,
      location: null,
      source: 'native',
      externalId: null,
      recurringEventId: null,
      originalStartAt: null,
      calendarConnectionId: null,
      syncToGoogle: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    expect(fosEventIdFromGoogle(payload)).toBe('evt-1')
  })
})
