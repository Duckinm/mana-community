import { env } from '@api/env'
import { db } from '@api/db'
import { accounts, calendarConnections, calendarEvents } from '@mana/db'
import { and, asc, eq, isNotNull } from 'drizzle-orm'
import {
  findGoogleCalendarAccounts,
  isGoogleCalendarScope,
  googleCalendarFetchForAccount,
} from '@api/lib/google-calendar/tokens'
import { GOOGLE_FETCH_TIMEOUT_MS } from '@api/lib/google/tokens'

export type CalendarConnectionItem = {
  id: string
  accountId: string
  calendarId: string
  calendarName: string | null
  accountEmail: string | null
  lastSyncedAt: string | null
}

export type CalendarConnectionDto = {
  connected: boolean
  calendars: CalendarConnectionItem[]
  limit: number | null
  oauthConfigured: boolean
}

export type GoogleCalendarListItem = {
  id: string
  name: string
  primary: boolean
}

export type GoogleCalendarAccountGroup = {
  accountId: string
  accountEmail: string
  calendars: GoogleCalendarListItem[]
  error?: true
}

export function isGoogleOAuthConfigured(): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

function toItem(row: typeof calendarConnections.$inferSelect): CalendarConnectionItem {
  return {
    id: row.id,
    accountId: row.accountId,
    calendarId: row.calendarId as string,
    calendarName: row.calendarName,
    accountEmail: row.accountEmail,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  }
}

export async function getCalendarConnection(userId: string): Promise<CalendarConnectionDto> {
  const accountRows = await findGoogleCalendarAccounts(userId)
  const limit = null
  if (accountRows.length === 0) {
    return { connected: false, calendars: [], limit, oauthConfigured: isGoogleOAuthConfigured() }
  }

  const rows = await getGoogleConnectionRows(userId)

  return {
    connected: true,
    calendars: rows.map(toItem),
    limit,
    oauthConfigured: isGoogleOAuthConfigured(),
  }
}

export async function listGoogleCalendars(userId: string): Promise<GoogleCalendarAccountGroup[]> {
  const accountRows = await findGoogleCalendarAccounts(userId)

  const groups: GoogleCalendarAccountGroup[] = []
  for (const account of accountRows) {
    try {
      const payload = await googleCalendarFetchForAccount<{
        items?: { id: string; summary: string; primary?: boolean }[]
      }>(account, '/users/me/calendarList')

      const calendars = (payload.items ?? []).map((item) => ({
        id: item.id,
        name: item.summary,
        primary: !!item.primary,
      }))
      const accountEmail = calendars.find((c) => c.primary)?.id ?? account.accountId

      groups.push({ accountId: account.id, accountEmail, calendars })
    } catch (error) {
      console.error('[calendar] calendarList failed for account', account.id, error)
      // Dead/expired token on this one account — surface it, don't fail the whole list.
      // Prefer a stored email over the raw Google sub so the label stays human-readable.
      const [known] = await db
        .select({ accountEmail: calendarConnections.accountEmail })
        .from(calendarConnections)
        .where(and(eq(calendarConnections.accountId, account.id), isNotNull(calendarConnections.accountEmail)))
        .limit(1)
      groups.push({
        accountId: account.id,
        accountEmail: known?.accountEmail ?? account.accountId,
        calendars: [],
        error: true,
      })
    }
  }

  return groups
}

export type SelectGoogleCalendarResult =
  | { ok: true; item: CalendarConnectionItem }
  | { ok: false; reason: 'not_connected' | 'duplicate' }

export async function selectGoogleCalendar(
  userId: string,
  accountId: string,
  calendarId: string,
  calendarName: string,
  accountEmail?: string,
): Promise<SelectGoogleCalendarResult> {
  const accountRows = await findGoogleCalendarAccounts(userId)
  const account = accountRows.find((row) => row.id === accountId)
  if (!account) return { ok: false, reason: 'not_connected' }

  const existingRows = await db
    .select()
    .from(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, 'google')))

  if (existingRows.some((row) => row.calendarId === calendarId && row.accountId === accountId)) {
    return { ok: false, reason: 'duplicate' }
  }

  const pending = existingRows.find((row) => !row.calendarId)


  const [connection] = pending
    ? await db
        .update(calendarConnections)
        .set({
          accountId: account.id,
          calendarId,
          calendarName,
          accountEmail: accountEmail ?? null,
          syncToken: null,
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, pending.id))
        .returning()
    : await db
        .insert(calendarConnections)
        .values({
          userId,
          provider: 'google',
          accountId: account.id,
          calendarId,
          calendarName,
          accountEmail: accountEmail ?? null,
        })
        .returning()

  return { ok: true, item: toItem(connection) }
}

export async function removeGoogleCalendarConnection(userId: string, connectionId: string) {
  const [deleted] = await db
    .delete(calendarConnections)
    .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.userId, userId)))
    .returning()
  if (deleted) {
    // Imported copies must go with their connection — dedupe is per-connection, so re-adding would duplicate them.
    await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.calendarConnectionId, deleted.id), eq(calendarEvents.source, 'google')))
  }
  return deleted ?? null
}

export async function disconnectGoogleCalendar(userId: string): Promise<CalendarConnectionDto> {
  const accountRows = await findGoogleCalendarAccounts(userId)

  for (const account of accountRows) {
    const remainingScope = (account.scope ?? '')
      .split(/[\s,]+/)
      .filter((s) => s && !isGoogleCalendarScope(s))
      .join(' ')
    if (account.refreshToken && env.GOOGLE_CLIENT_ID) {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        signal: AbortSignal.timeout(GOOGLE_FETCH_TIMEOUT_MS),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: account.refreshToken }),
      }).catch(() => undefined)
    }

    await db
      .update(accounts)
      .set({
        scope: remainingScope || null,
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, account.id))
  }

  await db
    .delete(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, 'google')))
  await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.source, 'google')))

  return getCalendarConnection(userId)
}

export async function getGoogleConnectionRows(userId: string) {
  return db
    .select()
    .from(calendarConnections)
    .where(and(
      eq(calendarConnections.userId, userId),
      eq(calendarConnections.provider, 'google'),
      isNotNull(calendarConnections.calendarId),
    ))
    .orderBy(asc(calendarConnections.createdAt))
}

/** ponytail: oldest connection = default outbound calendar; add explicit default flag if users ask. */
export async function getDefaultOutboundConnection(userId: string) {
  const rows = await getGoogleConnectionRows(userId)
  return rows[0] ?? null
}

export async function updateConnectionSyncState(
  connectionId: string,
  patch: {
    syncToken?: string | null
    lastSyncedAt?: Date
    channelId?: string | null
    channelResourceId?: string | null
    channelExpiresAt?: Date | null
  },
) {
  await db
    .update(calendarConnections)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(calendarConnections.id, connectionId))
}
