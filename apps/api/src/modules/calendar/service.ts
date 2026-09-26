import { db } from '@api/db'
import { calendarConnections, calendarEvents, contacts, documents, milestones } from '@mana/db'
import { CALENDAR_DATE_RE } from '@mana/db/calendar-date'
import { addCalendarDays, todayCalendarDate } from '@api/lib/calendar-date'
import {
  addExdate,
  allDaySpan,
  continuationRrule,
  getSeriesStart,
  instanceKey,
  parseExdates,
  parseInstanceStart,
  serializeExdates,
  seriesDurationMs,
  truncateRruleBefore,
  validateRrule,
  type RecurrenceScope,
} from '@api/lib/calendar-recurrence'
import { cancelGoogleOccurrence, deleteGoogleEvent, pushEventToGoogle } from '@api/modules/calendar/sync'
import { ValidationError } from '@api/lib/errors'
import type { Static } from 'elysia'
import type { CreateCalendarEventBody, UpdateCalendarEventBody } from '@api/modules/calendar/model'
import { and, asc, eq, gt, gte, isNotNull, isNull, lt, lte, or } from 'drizzle-orm'

type CalendarEventRow = typeof calendarEvents.$inferSelect

export type CalendarEventDto = {
  id: string
  title: string
  allDay: boolean
  startDate: string | null
  endDate: string | null
  startAt: string | null
  endAt: string | null
  timeZone: string
  rrule: string | null
  exdates: string[]
  recurringEventId: string | null
  originalStartAt: string | null
  alertMinutes: number[] | null
  contactId: string | null
  contactName: string | null
  contactEmail: string | null
  note: string | null
  location: string | null
  source: string
  calendarConnectionId: string | null
  syncToGoogle: boolean
  accountEmail: string | null
  calendarName: string | null
  createdAt: string
  updatedAt: string
  googleSyncFailed?: boolean
}

type CreateBody = Static<typeof CreateCalendarEventBody>

type UpdateBody = Static<typeof UpdateCalendarEventBody>

type ScopeOptions = {
  scope?: RecurrenceScope
  instanceStart?: string
}

function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null
}

function eventToClientDto(
  row: CalendarEventRow,
  contact?: { name: string; email: string | null } | null,
  connection?: { accountEmail: string | null; calendarName: string | null } | null,
): CalendarEventDto {
  return {
    id: row.id,
    title: row.title,
    allDay: row.allDay,
    startDate: row.startDate,
    endDate: row.endDate,
    startAt: toIso(row.startAt),
    endAt: toIso(row.endAt),
    timeZone: row.timeZone,
    rrule: row.rrule,
    exdates: parseExdates(row.exdates),
    recurringEventId: row.recurringEventId,
    originalStartAt: toIso(row.originalStartAt),
    alertMinutes: row.alertMinutes,
    contactId: row.contactId,
    contactName: contact?.name ?? null,
    contactEmail: contact?.email ?? null,
    note: row.note,
    location: row.location,
    source: row.source,
    calendarConnectionId: row.calendarConnectionId,
    syncToGoogle: row.syncToGoogle,
    accountEmail: connection?.accountEmail ?? null,
    calendarName: connection?.calendarName ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function rangeStartDate(iso: string): string {
  return iso.slice(0, 10)
}

function rangeEndDate(iso: string): string {
  return iso.slice(0, 10)
}

async function loadContact(userId: string, contactId: string | null | undefined) {
  if (!contactId) return null
  const [contact] = await db
    .select({ name: contacts.name, email: contacts.email })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
  return contact ?? null
}

/** False means Google rejected the write (403 on calendars you can't edit) — the client warns. */
async function pushEventSafely(userId: string, row: CalendarEventRow) {
  try {
    await pushEventToGoogle(userId, row)
    return true
  } catch {
    return false
  }
}

async function savedEventDto(userId: string, row: CalendarEventRow) {
  const pushed = await pushEventSafely(userId, row)
  const contact = await loadContact(userId, row.contactId)
  return { ...eventToClientDto(row, contact), googleSyncFailed: !pushed }
}

async function deleteGoogleEventSafely(userId: string, row: CalendarEventRow) {
  if (!row.externalId) return
  try {
    await deleteGoogleEvent(userId, row)
  } catch {
    // Google sync is best-effort; local CRUD still succeeds
  }
}

async function cancelGoogleOccurrenceSafely(userId: string, series: CalendarEventRow, at: Date) {
  if (!series.externalId) return
  try {
    await cancelGoogleOccurrence(userId, series, at)
  } catch {
    // Google sync is best-effort; local CRUD still succeeds
  }
}

async function getOwnedEvent(userId: string, eventId: string) {
  const [row] = await db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)))
  return row ?? null
}

/**
 * An event that ends before it starts is invisible: the range query needs
 * `startAt < rangeEnd AND endAt > rangeStart` to overlap.
 */
function assertEventRange(values: Pick<typeof calendarEvents.$inferInsert, 'allDay' | 'startDate' | 'endDate' | 'startAt' | 'endAt'>) {
  if (values.allDay) {
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      throw new ValidationError('endDate must not be before startDate')
    }
    return
  }
  if (values.startAt && values.endAt && values.endAt.getTime() < values.startAt.getTime()) {
    throw new ValidationError('endAt must not be before startAt')
  }
}

function buildInsertValues(userId: string, body: CreateBody, overrides?: Partial<typeof calendarEvents.$inferInsert>) {
  const timeZone = body.timeZone ?? 'UTC'
  const values = {
    userId,
    title: body.title.trim(),
    allDay: body.allDay,
    startDate: body.allDay ? (body.startDate ?? null) : null,
    endDate: body.allDay ? (body.endDate ?? body.startDate ?? null) : null,
    startAt: body.allDay ? null : body.startAt ? new Date(body.startAt) : null,
    endAt: body.allDay ? null : body.endAt ? new Date(body.endAt) : null,
    timeZone,
    rrule: body.rrule?.trim() || null,
    exdates: '[]',
    alertMinutes: body.alertMinutes ?? null,
    contactId: body.contactId ?? null,
    note: body.note?.trim() || null,
    location: body.location?.trim() || null,
    calendarConnectionId: body.calendarConnectionId ?? null,
    syncToGoogle: body.syncToGoogle ?? true,
    ...overrides,
  }

  assertEventRange(values)
  if (values.rrule) {
    validateRrule(values.rrule, getSeriesStart(values))
  }

  return values
}

function buildRangeWhere(userId: string, opts: { start: string; end: string }) {
  const rangeStart = new Date(opts.start)
  const rangeEnd = new Date(opts.end)
  const startDate = rangeStartDate(opts.start)
  const endDate = rangeEndDate(opts.end)

  const inRangeSingle = or(
    and(
      eq(calendarEvents.allDay, true),
      isNotNull(calendarEvents.startDate),
      lte(calendarEvents.startDate, endDate),
      gte(calendarEvents.endDate, startDate),
    ),
    and(
      eq(calendarEvents.allDay, false),
      isNotNull(calendarEvents.startAt),
      isNotNull(calendarEvents.endAt),
      lt(calendarEvents.startAt, rangeEnd),
      gt(calendarEvents.endAt, rangeStart),
    ),
  )

  return and(
    eq(calendarEvents.userId, userId),
    or(
      and(isNull(calendarEvents.rrule), inRangeSingle),
      and(
        isNotNull(calendarEvents.rrule),
        isNull(calendarEvents.recurringEventId),
        or(
          and(eq(calendarEvents.allDay, true), lte(calendarEvents.startDate, endDate)),
          and(eq(calendarEvents.allDay, false), lt(calendarEvents.startAt, rangeEnd)),
        ),
      ),
      and(isNotNull(calendarEvents.recurringEventId), inRangeSingle),
    ),
  )
}

function applyPatchToValues(
  body: UpdateBody,
  existing: CalendarEventRow,
): Partial<typeof calendarEvents.$inferInsert> {
  const patch: Partial<typeof calendarEvents.$inferInsert> = { updatedAt: new Date() }

  if (body.title !== undefined) patch.title = body.title.trim()
  if (body.allDay !== undefined) patch.allDay = body.allDay
  if (body.timeZone !== undefined) patch.timeZone = body.timeZone
  if (body.alertMinutes !== undefined) patch.alertMinutes = body.alertMinutes
  if (body.contactId !== undefined) patch.contactId = body.contactId
  if (body.note !== undefined) patch.note = body.note?.trim() || null
  if (body.location !== undefined) patch.location = body.location?.trim() || null
  if (body.rrule !== undefined) patch.rrule = body.rrule?.trim() || null

  if (body.allDay === true) {
    patch.startDate = body.startDate ?? null
    patch.endDate = body.endDate ?? body.startDate ?? null
    patch.startAt = null
    patch.endAt = null
  } else if (body.allDay === false) {
    patch.startDate = null
    patch.endDate = null
    if (body.startAt !== undefined) patch.startAt = body.startAt ? new Date(body.startAt) : null
    if (body.endAt !== undefined) patch.endAt = body.endAt ? new Date(body.endAt) : null
  } else {
    if (body.startDate !== undefined) patch.startDate = body.startDate
    if (body.endDate !== undefined) patch.endDate = body.endDate
    if (body.startAt !== undefined) patch.startAt = body.startAt ? new Date(body.startAt) : null
    if (body.endAt !== undefined) patch.endAt = body.endAt ? new Date(body.endAt) : null
  }

  const merged = { ...existing, ...patch }
  assertEventRange(merged)
  if (patch.rrule && merged.rrule) {
    validateRrule(merged.rrule, getSeriesStart(merged))
  }

  return patch
}

async function deleteSeriesChildren(userId: string, masterId: string) {
  await db
    .delete(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        eq(calendarEvents.recurringEventId, masterId),
      ),
    )
}

export async function listCalendarEvents(
  userId: string,
  opts: { start: string; end: string; limit?: number },
): Promise<CalendarEventDto[]> {
  const query = db
    .select({
      event: calendarEvents,
      contactName: contacts.name,
      contactEmail: contacts.email,
    })
    .from(calendarEvents)
    .leftJoin(contacts, eq(calendarEvents.contactId, contacts.id))
    .where(buildRangeWhere(userId, opts))
    .orderBy(asc(calendarEvents.startAt), asc(calendarEvents.startDate))
  const rows = opts.limit === undefined ? await query : await query.limit(opts.limit)

  const connectionRows = await db
    .select({
      id: calendarConnections.id,
      accountEmail: calendarConnections.accountEmail,
      calendarName: calendarConnections.calendarName,
    })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId))
  const connectionsById = new Map(connectionRows.map((c) => [c.id, c]))

  return rows.map(({ event, contactName, contactEmail }) =>
    eventToClientDto(
      event,
      contactName ? { name: contactName, email: contactEmail } : null,
      event.calendarConnectionId ? connectionsById.get(event.calendarConnectionId) ?? null : null,
    ),
  )
}

export async function createCalendarEvent(userId: string, body: CreateBody) {
  const [row] = await db
    .insert(calendarEvents)
    .values(buildInsertValues(userId, body))
    .returning()
  return savedEventDto(userId, row)
}

export async function patchCalendarEvent(
  userId: string,
  eventId: string,
  body: UpdateBody,
  scopeOpts: ScopeOptions = {},
) {
  const existing = await getOwnedEvent(userId, eventId)
  if (!existing) return null

  const scope = scopeOpts.scope ?? 'all'
  const instanceStartRaw = scopeOpts.instanceStart

  if (existing.recurringEventId) {
    const patch = applyPatchToValues(body, existing)
    const [updated] = await db
      .update(calendarEvents)
      .set(patch)
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)))
      .returning()
    if (!updated) return null
    return savedEventDto(userId, updated)
  }

  if (!existing.rrule || scope === 'all') {
    const patch = applyPatchToValues(body, existing)
    const [updated] = await db
      .update(calendarEvents)
      .set(patch)
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)))
      .returning()
    if (!updated) return null
    return savedEventDto(userId, updated)
  }

  if (!instanceStartRaw) return null
  const instanceAt = parseInstanceStart(existing.allDay, instanceStartRaw)
  const key = instanceKey(existing.allDay, instanceAt)

  if (scope === 'single') {
    const exdates = addExdate(parseExdates(existing.exdates), key)
    await db
      .update(calendarEvents)
      .set({ exdates: serializeExdates(exdates), updatedAt: new Date() })
      .where(eq(calendarEvents.id, existing.id))

    const duration = seriesDurationMs(existing)
    const exceptionStart = instanceAt
    const exceptionEnd = new Date(exceptionStart.getTime() + duration - (existing.allDay ? 86400000 : 0))

    const [created] = await db
      .insert(calendarEvents)
      .values(
        buildInsertValues(userId, {
          title: body.title ?? existing.title,
          allDay: body.allDay ?? existing.allDay,
          startDate: (body.allDay ?? existing.allDay)
            ? (body.startDate ?? key)
            : null,
          endDate: (body.allDay ?? existing.allDay)
            ? (body.endDate ?? body.startDate ?? addCalendarDays(key, allDaySpan(duration)))
            : null,
          startAt: !(body.allDay ?? existing.allDay)
            ? (body.startAt ?? exceptionStart.toISOString())
            : null,
          endAt: !(body.allDay ?? existing.allDay)
            ? (body.endAt ?? exceptionEnd.toISOString())
            : null,
          timeZone: body.timeZone ?? existing.timeZone,
          alertMinutes: body.alertMinutes ?? existing.alertMinutes,
          contactId: body.contactId ?? existing.contactId,
          note: body.note ?? existing.note,
          location: body.location ?? existing.location,
        }, {
          recurringEventId: existing.id,
          originalStartAt: instanceAt,
          rrule: null,
          syncToGoogle: existing.syncToGoogle,
        }),
      )
      .returning()

    return savedEventDto(userId, created)
  }

  if (scope === 'following') {
    const truncated = truncateRruleBefore(existing.rrule, getSeriesStart(existing), instanceAt)
    await db
      .update(calendarEvents)
      .set({ rrule: truncated || null, updatedAt: new Date() })
      .where(eq(calendarEvents.id, existing.id))

    const duration = seriesDurationMs(existing)
    const newStart = instanceAt
    const newEnd = new Date(newStart.getTime() + duration - (existing.allDay ? 86400000 : 0))
    const continuation = body.rrule ?? continuationRrule(existing.rrule, getSeriesStart(existing), newStart)

    const [created] = await db
      .insert(calendarEvents)
      .values(
        buildInsertValues(userId, {
          title: body.title ?? existing.title,
          allDay: body.allDay ?? existing.allDay,
          startDate: (body.allDay ?? existing.allDay) ? key : null,
          endDate: (body.allDay ?? existing.allDay)
            ? (body.endDate ?? addCalendarDays(key, allDaySpan(duration)))
            : null,
          startAt: !(body.allDay ?? existing.allDay)
            ? (body.startAt ?? newStart.toISOString())
            : null,
          endAt: !(body.allDay ?? existing.allDay)
            ? (body.endAt ?? newEnd.toISOString())
            : null,
          timeZone: body.timeZone ?? existing.timeZone,
          rrule: continuation,
          alertMinutes: body.alertMinutes ?? existing.alertMinutes,
          contactId: body.contactId ?? existing.contactId,
          note: body.note ?? existing.note,
          location: body.location ?? existing.location,
        }, { syncToGoogle: existing.syncToGoogle }),
      )
      .returning()

    return savedEventDto(userId, created)
  }

  return null
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string,
  scopeOpts: ScopeOptions = {},
) {
  const existing = await getOwnedEvent(userId, eventId)
  if (!existing) return null

  const scope = scopeOpts.scope ?? 'all'

  if (existing.recurringEventId) {
    await deleteGoogleEventSafely(userId, existing)
    const [deleted] = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)))
      .returning({ id: calendarEvents.id })
    return deleted ?? null
  }

  if (!existing.rrule || scope === 'all') {
    await deleteGoogleEventSafely(userId, existing)
    await deleteSeriesChildren(userId, existing.id)
    const [deleted] = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)))
      .returning({ id: calendarEvents.id })
    return deleted ?? null
  }

  const instanceStartRaw = scopeOpts.instanceStart
  if (!instanceStartRaw) return null

  const instanceAt = parseInstanceStart(existing.allDay, instanceStartRaw)
  const key = instanceKey(existing.allDay, instanceAt)

  if (scope === 'single') {
    const exdates = addExdate(parseExdates(existing.exdates), key)
    const [updated] = await db
      .update(calendarEvents)
      .set({ exdates: serializeExdates(exdates), updatedAt: new Date() })
      .where(eq(calendarEvents.id, existing.id))
      .returning({ id: calendarEvents.id })
    await cancelGoogleOccurrenceSafely(userId, existing, instanceAt)
    return updated ?? null
  }

  if (scope === 'following') {
    const truncated = truncateRruleBefore(existing.rrule, getSeriesStart(existing), instanceAt)
    const [updated] = await db
      .update(calendarEvents)
      .set({ rrule: truncated || null, updatedAt: new Date() })
      .where(eq(calendarEvents.id, existing.id))
      .returning({ id: calendarEvents.id })
    await db
      .delete(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          eq(calendarEvents.recurringEventId, existing.id),
          gte(calendarEvents.originalStartAt, instanceAt),
        ),
      )
    return updated ?? null
  }

  return null
}

export type CalendarOverlayDto = {
  id: string
  kind: 'milestone' | 'document'
  title: string
  date: string
  projectId: string | null
  documentId: string | null
  documentType: string | null
  documentStatus: DocumentOverlayStatus | null
  documentDateKind: DocumentDateKind | null
  urgency: DocumentOverlayUrgency | null
}

function isCalendarDate(value: string | null | undefined): value is string {
  return !!value && CALENDAR_DATE_RE.test(value)
}

export type DocumentDateKind = 'invoiceDue' | 'quoteExpiry' | 'recurringGeneration'
export type DocumentOverlayUrgency = 'normal' | 'dueSoon' | 'overdue' | 'expired'
export type DocumentOverlayStatus = 'published' | 'overdue'

type DocumentOverlayRow = {
  id: string
  type: string
  status: string
  number: string
  dueDate: string | null
  validUntilDate: string | null
  isRecurring: boolean
  nextGenerationDate: string | null
  projectId: string | null
  deletedAt: Date | null
}

type DocumentOverlayRange = {
  startDate: string
  endDate: string
  asOf?: string
}

const DUE_SOON_DAYS = 7

function documentDateUrgency(
  documentDateKind: DocumentDateKind,
  date: string,
  asOf: string,
): DocumentOverlayUrgency {
  if (documentDateKind === 'invoiceDue' && date < asOf) return 'overdue'
  if (documentDateKind === 'quoteExpiry' && date < asOf) return 'expired'
  if (documentDateKind === 'recurringGeneration') return 'normal'
  return date <= addCalendarDays(asOf, DUE_SOON_DAYS) ? 'dueSoon' : 'normal'
}

function documentOverlayTitle(number: string, documentDateKind: DocumentDateKind): string {
  switch (documentDateKind) {
    case 'invoiceDue':
      return `${number} due`
    case 'quoteExpiry':
      return `${number} expires`
    case 'recurringGeneration':
      return `${number} generates`
  }
}

function pushDocumentOverlay(
  overlays: CalendarOverlayDto[],
  row: DocumentOverlayRow,
  documentDateKind: DocumentDateKind,
  date: string | null,
  range: Required<DocumentOverlayRange>,
) {
  if (!isCalendarDate(date)) return
  if (date < range.startDate || date > range.endDate) return

  const urgency = documentDateUrgency(documentDateKind, date, range.asOf)

  overlays.push({
    id: `document:${row.id}:${documentDateKind}:${date}`,
    kind: 'document',
    title: documentOverlayTitle(row.number, documentDateKind),
    date,
    projectId: row.projectId,
    documentId: row.id,
    documentType: row.type,
    documentStatus: documentDateKind === 'invoiceDue' && urgency === 'overdue' ? 'overdue' : 'published',
    documentDateKind,
    urgency,
  })
}

export function documentOverlaysFromRow(
  row: DocumentOverlayRow,
  range: DocumentOverlayRange,
): CalendarOverlayDto[] {
  if (row.status !== 'published' || row.deletedAt || row.type === 'RC') return []

  const normalizedRange = {
    startDate: range.startDate,
    endDate: range.endDate,
    asOf: range.asOf ?? todayCalendarDate(),
  }
  const overlays: CalendarOverlayDto[] = []

  if (row.type === 'INV') {
    pushDocumentOverlay(overlays, row, 'invoiceDue', row.dueDate, normalizedRange)
  }

  if (row.type === 'QO') {
    pushDocumentOverlay(overlays, row, 'quoteExpiry', row.validUntilDate, normalizedRange)
  }

  if (row.isRecurring) {
    pushDocumentOverlay(overlays, row, 'recurringGeneration', row.nextGenerationDate, normalizedRange)
  }

  return overlays
}

export async function listCalendarOverlays(
  userId: string,
  opts: { start: string; end: string },
): Promise<CalendarOverlayDto[]> {
  const startDate = rangeStartDate(opts.start)
  const endDate = rangeEndDate(opts.end)
  const overlays: CalendarOverlayDto[] = []

  const milestoneRows = await db
    .select({
      id: milestones.id,
      name: milestones.name,
      dueDate: milestones.dueDate,
      projectId: milestones.projectId,
    })
    .from(milestones)
    .where(eq(milestones.userId, userId))

  for (const row of milestoneRows) {
    if (!isCalendarDate(row.dueDate)) continue
    if (row.dueDate < startDate || row.dueDate > endDate) continue
    overlays.push({
      id: `milestone:${row.id}`,
      kind: 'milestone',
      title: row.name,
      date: row.dueDate,
      projectId: row.projectId,
      documentId: null,
      documentType: null,
      documentStatus: null,
      documentDateKind: null,
      urgency: null,
    })
  }

  const documentRows = await db
    .select({
      id: documents.id,
      type: documents.type,
      status: documents.status,
      number: documents.number,
      dueDate: documents.dueDate,
      validUntilDate: documents.validUntilDate,
      isRecurring: documents.isRecurring,
      nextGenerationDate: documents.nextGenerationDate,
      projectId: documents.projectId,
      deletedAt: documents.deletedAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.userId, userId),
        eq(documents.status, 'published'),
        isNull(documents.deletedAt),
        or(eq(documents.type, 'INV'), eq(documents.type, 'QO'), eq(documents.isRecurring, true)),
      ),
    )

  for (const row of documentRows) {
    overlays.push(...documentOverlaysFromRow(row, { startDate, endDate }))
  }

  return overlays.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}
