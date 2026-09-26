import { afterAll, describe, expect, it } from 'bun:test'
import { calendarEvents, users } from '@mana/db'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@api/db'
import { calendarHandlers, calendarTools } from '@api/utils/mcp-tools/calendar'

const createdUserIds: string[] = []

function tool(name: string) {
  const found = calendarTools.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`Missing ${name}`)
  return found
}

afterAll(async () => {
  if (createdUserIds.length === 0) return
  await db.delete(calendarEvents).where(inArray(calendarEvents.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

describe('calendar MCP tools', () => {
  it('requires a bounded range for calendar reads', () => {
    const events = tool('list_calendar_events')
    const overlays = tool('list_calendar_overlays')

    expect(events.input_schema).toMatchObject({
      required: ['start', 'end'],
      properties: { limit: { minimum: 1, maximum: 100 } },
    })
    expect(overlays.input_schema).toMatchObject({
      required: ['start', 'end'],
      properties: { limit: { minimum: 1, maximum: 100 } },
    })
  })

  it('returns no more events than the requested bound', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Calendar MCP test', email: `calendar-mcp-${crypto.randomUUID()}@example.com` })
      .returning()
    createdUserIds.push(user.id)

    await db.insert(calendarEvents).values(
      [0, 1, 2].map((hour) => {
        const startHour = String(hour + 9).padStart(2, '0')
        const endHour = String(hour + 10).padStart(2, '0')
        return {
          userId: user.id,
          title: `Event ${hour}`,
          allDay: false,
          startAt: new Date(`2026-08-05T${startHour}:00:00.000Z`),
          endAt: new Date(`2026-08-05T${endHour}:00:00.000Z`),
          syncToGoogle: false,
        }
      }),
    )

    const result = await calendarHandlers['list_calendar_events'](user.id, {
      start: '2026-08-05T00:00:00.000Z',
      end: '2026-08-06T00:00:00.000Z',
      limit: 2,
    })

    expect(result).toHaveLength(2)
  })

  it('keeps external event creation local unless Google sync is explicitly confirmed', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Calendar MCP confirmation', email: `calendar-confirm-${crypto.randomUUID()}@example.com` })
      .returning()
    createdUserIds.push(user.id)

    const created = await calendarHandlers['create_calendar_event'](user.id, {
      title: 'Local external event',
      allDay: true,
      startDate: '2026-08-10',
    }, { source: 'external-mcp' }) as { id: string }

    const [stored] = await db
      .select({ syncToGoogle: calendarEvents.syncToGoogle })
      .from(calendarEvents)
      .where(eq(calendarEvents.id, created.id))

    expect(stored?.syncToGoogle).toBe(false)
    expect(() => calendarHandlers['create_calendar_event'](user.id, {
      title: 'Unconfirmed Google event',
      allDay: true,
      startDate: '2026-08-11',
      syncToGoogle: true,
    }, { source: 'external-mcp' })).toThrow('confirmGoogleSync')
  })
})
