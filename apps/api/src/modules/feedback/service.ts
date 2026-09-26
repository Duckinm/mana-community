import { db } from '@api/db'
import {
  feedback,
  users,
  type FeedbackSeverity,
  type FeedbackSource,
  type FeedbackStatus,
  type FeedbackType,
} from '@mana/db'
import { and, desc, eq, ilike, isNull, ne, or, type SQL } from 'drizzle-orm'
import { format } from 'date-fns'
import { createNotification } from '@api/modules/notifications/create'

function feedbackToWire(
  row: typeof feedback.$inferSelect,
  submitter?: { name: string; email: string } | null,
) {
  return {
    id: row.id,
    parentFeedbackId: row.parentFeedbackId,
    splitState: row.splitState,
    splitPartCount: row.splitPartCount,
    type: row.type,
    message: row.message,
    pagePath: row.pagePath,
    status: row.status,
    severity: row.severity,
    source: row.source,
    aiNote: row.aiNote,
    score: row.score,
    encounterCount: row.encounterCount,
    solutionSummary: row.solutionSummary,
    timeEstimate: row.timeEstimate,
    submitter: submitter ?? null,
    lastPrioritizedAt: row.lastPrioritizedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export interface ListFeedbackFilters {
  q?: string
  status?: FeedbackStatus
  type?: FeedbackType
  severity?: FeedbackSeverity
  source?: FeedbackSource
  page?: number
  pageSize?: number
}

export async function listFeedback(filters: ListFeedbackFilters = {}) {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20

  const conditions: SQL[] = []
  if (filters.status) conditions.push(eq(feedback.status, filters.status))
  if (filters.type) conditions.push(eq(feedback.type, filters.type))
  if (filters.severity) conditions.push(eq(feedback.severity, filters.severity))
  if (filters.source) conditions.push(eq(feedback.source, filters.source))
  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`
    const match = or(ilike(feedback.message, pattern), ilike(feedback.pagePath, pattern))
    if (match) conditions.push(match)
  }
  const where = conditions.length ? and(...conditions) : undefined

  const [rows, total] = await Promise.all([
    db
      .select({
        row: feedback,
        submitterName: users.name,
        submitterEmail: users.email,
      })
      .from(feedback)
      .innerJoin(users, eq(feedback.userId, users.id))
      .where(where)
      .orderBy(desc(feedback.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.$count(feedback, where),
  ])

  return {
    items: rows.map(({ row, submitterName, submitterEmail }) =>
      feedbackToWire(row, { name: submitterName, email: submitterEmail }),
    ),
    total,
    page,
    pageSize,
  }
}

export function detectSource(userAgent: string | null): FeedbackSource {
  if (!userAgent) return 'web'
  if (/iPad/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)))
    return 'tablet'
  if (/iPhone|iPod/i.test(userAgent)) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'web'
}

export async function createFeedback(
  userId: string,
  body: { type: FeedbackType; message: string; pagePath?: string; source?: FeedbackSource },
  userAgent: string | null = null,
) {
  const [row] = await db
    .insert(feedback)
    .values({
      userId,
      type: body.type,
      message: body.message,
      pagePath: body.pagePath ?? null,
      source: body.source ?? detectSource(userAgent),
    })
    .returning()
  return feedbackToWire(row)
}

export async function feedbackMetrics() {
  // ponytail: aggregate in JS — feedback volume is tiny; move to SQL GROUP BY if it ever isn't
  const rows = await db
    .select({
      type: feedback.type,
      status: feedback.status,
      severity: feedback.severity,
      pagePath: feedback.pagePath,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    })
    .from(feedback)
    .where(or(isNull(feedback.splitState), ne(feedback.splitState, 'compound')))

  const days: Array<{ date: string; count: number }> = []
  const dayIndex = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = format(d, 'yyyy-MM-dd')
    dayIndex.set(key, days.length)
    days.push({ date: key, count: 0 })
  }

  const byType: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  const bySeverity: Record<string, number> = {}
  const pageCounts = new Map<string, number>()
  let open = 0
  let resolvedCount = 0
  let resolutionMs = 0

  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + 1
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    if (row.severity) bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1
    if (row.pagePath) pageCounts.set(row.pagePath, (pageCounts.get(row.pagePath) ?? 0) + 1)
    if (row.status === 'new' || row.status === 'planned' || row.status === 'in_progress') open++
    if (row.status === 'resolved') {
      // ponytail: updatedAt as resolution proxy — add resolvedAt column if precision matters
      resolvedCount++
      resolutionMs += row.updatedAt.getTime() - row.createdAt.getTime()
    }
    const idx = dayIndex.get(format(row.createdAt, 'yyyy-MM-dd'))
    if (idx !== undefined) days[idx].count++
  }

  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pagePath, count]) => ({ pagePath, count }))

  return {
    perDay: days,
    byType,
    byStatus,
    bySeverity,
    topPages,
    avgResolutionDays:
      resolvedCount > 0
        ? Math.round((resolutionMs / resolvedCount / 86_400_000) * 10) / 10
        : null,
    total: rows.length,
    open,
  }
}

const STATUS_NOTIFICATION: Record<FeedbackStatus, { title: string; key: string } | null> = {
  new: null,
  planned: { title: 'Your feedback is planned', key: 'feedbackPlanned' },
  in_progress: { title: 'Your feedback is being worked on', key: 'feedbackInProgress' },
  resolved: { title: 'Your feedback has been resolved', key: 'feedbackResolved' },
  declined: { title: 'Your feedback was reviewed and declined', key: 'feedbackDeclined' },
}

export async function patchFeedback(
  feedbackId: string,
  patch: {
    status?: FeedbackStatus
    severity?: FeedbackSeverity | null
  },
) {
  const set: Partial<typeof feedback.$inferInsert> = { updatedAt: new Date() }
  if (patch.status !== undefined) set.status = patch.status
  if (patch.severity !== undefined) set.severity = patch.severity

  const [current] = await db
    .select({ status: feedback.status })
    .from(feedback)
    .where(eq(feedback.id, feedbackId))
  if (!current) return null

  const [updated] = await db
    .update(feedback)
    .set(set)
    .where(eq(feedback.id, feedbackId))
    .returning()
  if (!updated) return null

  const notification = patch.status !== undefined ? STATUS_NOTIFICATION[patch.status] : null
  if (notification && patch.status !== current.status) {
    const message = updated.message.length > 140 ? `${updated.message.slice(0, 140)}…` : updated.message
    await createNotification({
      userId: updated.userId,
      title: notification.title,
      body: message,
      key: notification.key,
      params: { message },
    })
  }

  return feedbackToWire(updated)
}
