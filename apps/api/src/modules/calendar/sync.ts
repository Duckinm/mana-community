import { db } from '@api/db'
import { accounts, calendarConnections, calendarEvents } from '@mana/db'
import { and, eq, isNotNull } from 'drizzle-orm'
import {
  calendarRowToGoogleEvent,
  fosEventIdFromGoogle,
  googleEventToInsertValues,
  googleOriginalStart,
  mergeGooglePatch,
  type GoogleCalendarEvent,
} from '@api/lib/google-calendar/map-event'
import { googleCalendarFetchForAccount, hasGoogleCalendarScope, type GoogleAccountRow } from '@api/lib/google-calendar/tokens'
import { addExdate, instanceKey, parseExdates, serializeExdates } from '@api/lib/calendar-recurrence'
import {
  getDefaultOutboundConnection,
  getGoogleConnectionRows,
  updateConnectionSyncState,
} from '@api/modules/calendar/connection'

type CalendarEventRow = typeof calendarEvents.$inferSelect
type CalendarConnectionRow = Awaited<ReturnType<typeof getGoogleConnectionRows>>[number]

async function getConnectionAccount(connection: CalendarConnectionRow): Promise<GoogleAccountRow | null> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, connection.accountId))
  if (!account || !hasGoogleCalendarScope(account.scope)) return null
  return account
}

type GoogleListResponse = {
  items?: GoogleCalendarEvent[]
  nextSyncToken?: string
  nextPageToken?: string
}

async function findByExternalId(userId: string, connectionId: string, externalId: string) {
  const [row] = await db
    .select()
    .from(calendarEvents)
    .where(and(
      eq(calendarEvents.externalId, externalId),
      eq(calendarEvents.userId, userId),
      eq(calendarEvents.calendarConnectionId, connectionId),
    ))
  return row ?? null
}

/** Google models a modified/cancelled occurrence as its own event; the series must skip that date. */
async function exdateSeries(series: CalendarEventRow, event: GoogleCalendarEvent) {
  const original = event.originalStartTime
  const key = original?.date
    ? original.date
    : original?.dateTime
      ? instanceKey(false, new Date(original.dateTime))
      : null
  if (!key) return

  const exdates = addExdate(parseExdates(series.exdates), key)
  await db
    .update(calendarEvents)
    .set({ exdates: serializeExdates(exdates), updatedAt: new Date() })
    .where(eq(calendarEvents.id, series.id))
}

/** Dedupe scoped per connection: the same Google event can appear in multiple synced calendars (invites). */
async function applyInboundEvent(userId: string, connectionId: string, event: GoogleCalendarEvent) {
  const fosEventId = fosEventIdFromGoogle(event)
  const series = event.recurringEventId
    ? await findByExternalId(userId, connectionId, event.recurringEventId)
    : null

  if (series) await exdateSeries(series, event)

  if (event.status === 'cancelled') {
    if (fosEventId) {
      await db
        .delete(calendarEvents)
        .where(and(eq(calendarEvents.id, fosEventId), eq(calendarEvents.userId, userId)))
      return
    }
    if (event.id) {
      await db
        .delete(calendarEvents)
        .where(and(
          eq(calendarEvents.externalId, event.id),
          eq(calendarEvents.userId, userId),
          eq(calendarEvents.calendarConnectionId, connectionId),
        ))
    }
    return
  }

  if (fosEventId) {
    const [existing] = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, fosEventId), eq(calendarEvents.userId, userId)))

    if (existing) {
      await db
        .update(calendarEvents)
        .set(mergeGooglePatch(existing, event))
        .where(eq(calendarEvents.id, existing.id))
      return
    }
  }

  if (event.id) {
    const [existingExternal] = await db
      .select()
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.externalId, event.id),
        eq(calendarEvents.userId, userId),
        eq(calendarEvents.calendarConnectionId, connectionId),
      ))

    if (existingExternal) {
      await db
        .update(calendarEvents)
        .set(mergeGooglePatch(existingExternal, event))
        .where(eq(calendarEvents.id, existingExternal.id))
      return
    }
  }

  const insertValues = googleEventToInsertValues(userId, event)
  if (!insertValues) return
  await db.insert(calendarEvents).values({
    ...insertValues,
    calendarConnectionId: connectionId,
    recurringEventId: series?.id ?? null,
  })
}

async function syncConnectionInbound(userId: string, connection: CalendarConnectionRow, account: GoogleAccountRow) {
  let pageToken: string | undefined
  let imported = 0
  let nextSyncToken = connection.syncToken ?? undefined

  do {
    const query = new URLSearchParams({ singleEvents: 'false', showDeleted: 'true' })
    if (connection.syncToken) {
      query.set('syncToken', connection.syncToken)
    } else {
      query.set('maxResults', '250')
    }
    if (pageToken) query.set('pageToken', pageToken)

    const payload = await googleCalendarFetchForAccount<GoogleListResponse>(
      account,
      `/calendars/${encodeURIComponent(connection.calendarId as string)}/events?${query.toString()}`,
    )

    // ponytail: series before its exceptions, page-local only — an exception split across pages
    // lands unlinked until the next full resync. Order by parent lookup if that ever bites.
    const items = [...(payload.items ?? [])].sort(
      (a, b) => Number(!!a.recurringEventId) - Number(!!b.recurringEventId),
    )

    for (const event of items) {
      await applyInboundEvent(userId, connection.id, event)
      imported++
    }

    pageToken = payload.nextPageToken
    if (payload.nextSyncToken) nextSyncToken = payload.nextSyncToken
  } while (pageToken)

  if (nextSyncToken) {
    await updateConnectionSyncState(connection.id, {
      syncToken: nextSyncToken,
      lastSyncedAt: new Date(),
    })
  }

  return imported
}

export async function syncGoogleCalendarInbound(userId: string) {
  const connections = await getGoogleConnectionRows(userId)
  if (connections.length === 0) {
    return { imported: 0, skipped: true }
  }

  let imported = 0
  for (const connection of connections) {
    const account = await getConnectionAccount(connection)
    if (!account) continue
    imported += await syncConnectionInbound(userId, connection, account)
  }

  return { imported, skipped: false }
}

async function getRow(id: string) {
  const [row] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id))
  return row ?? null
}

/** Google addresses a modified occurrence by its own instance id, not by the series id. */
async function findInstanceId(
  account: GoogleAccountRow,
  calendarId: string,
  series: CalendarEventRow,
  originalStartAt: Date,
) {
  const originalStart = googleOriginalStart(series.allDay, originalStartAt)
  const payload = await googleCalendarFetchForAccount<GoogleListResponse>(
    account,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(series.externalId as string)}` +
      `/instances?maxResults=1&originalStart=${encodeURIComponent(originalStart)}`,
  )
  return payload.items?.[0]?.id ?? null
}

/** Google-sourced rows push too: PATCH by externalId. Read-only calendars 403 — caller swallows it. */
export async function pushEventToGoogle(userId: string, row: CalendarEventRow) {
  if (!row.syncToGoogle) return null

  const series = row.recurringEventId ? await getRow(row.recurringEventId) : null
  const connectionId = row.calendarConnectionId ?? series?.calendarConnectionId
  const connection = connectionId
    ? (await getGoogleConnectionRows(userId)).find((c) => c.id === connectionId)
    : await getDefaultOutboundConnection(userId)
  if (!connection?.calendarId) return null

  const account = await getConnectionAccount(connection)
  if (!account) return null

  const body = calendarRowToGoogleEvent(row)
  const calendarPath = `/calendars/${encodeURIComponent(connection.calendarId)}/events`

  if (!row.externalId && series?.externalId && row.originalStartAt) {
    const instanceId = await findInstanceId(account, connection.calendarId, series, row.originalStartAt)
    if (instanceId) {
      const updated = await googleCalendarFetchForAccount<GoogleCalendarEvent>(
        account,
        `${calendarPath}/${encodeURIComponent(instanceId)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      )
      const externalId = updated.id ?? instanceId
      await db
        .update(calendarEvents)
        .set({ externalId, calendarConnectionId: connection.id, updatedAt: new Date() })
        .where(eq(calendarEvents.id, row.id))
      return externalId
    }
  }

  if (row.externalId) {
    const updated = await googleCalendarFetchForAccount<GoogleCalendarEvent>(
      account,
      `${calendarPath}/${encodeURIComponent(row.externalId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
    return updated.id ?? row.externalId
  }

  const created = await googleCalendarFetchForAccount<GoogleCalendarEvent>(account, calendarPath, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (created.id) {
    await db
      .update(calendarEvents)
      .set({ externalId: created.id, calendarConnectionId: connection.id, updatedAt: new Date() })
      .where(eq(calendarEvents.id, row.id))
  }

  return created.id ?? null
}

export async function deleteGoogleEvent(userId: string, row: CalendarEventRow) {
  if (!row.externalId) return

  const connections = await getGoogleConnectionRows(userId)
  const connection = row.calendarConnectionId
    ? connections.find((c) => c.id === row.calendarConnectionId)
    : connections[0]
  if (!connection?.calendarId) return

  const account = await getConnectionAccount(connection)
  if (!account) return

  await googleCalendarFetchForAccount(
    account,
    `/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(row.externalId)}`,
    { method: 'DELETE' },
  )
}

export async function cancelGoogleOccurrence(
  userId: string,
  series: CalendarEventRow,
  instanceAt: Date,
) {
  if (!series.externalId) return

  const connections = await getGoogleConnectionRows(userId)
  const connection = series.calendarConnectionId
    ? connections.find((c) => c.id === series.calendarConnectionId)
    : connections[0]
  if (!connection?.calendarId) return

  const account = await getConnectionAccount(connection)
  if (!account) return

  const instanceId = await findInstanceId(account, connection.calendarId, series, instanceAt)
  if (!instanceId) return

  await googleCalendarFetchForAccount(
    account,
    `/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(instanceId)}`,
    { method: 'DELETE' },
  )
}

export async function syncAllGoogleConnections() {
  const rows = await db
    .selectDistinct({ userId: calendarConnections.userId })
    .from(calendarConnections)
    .where(and(eq(calendarConnections.provider, 'google'), isNotNull(calendarConnections.calendarId)))

  const results = []
  for (const row of rows) {
    try {
      results.push({ userId: row.userId, ...(await syncGoogleCalendarInbound(row.userId)) })
    } catch (error) {
      results.push({
        userId: row.userId,
        error: error instanceof Error ? error.message : 'sync failed',
      })
    }
  }

  return results
}
