import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { db } from '@api/db'
import { activityLogs } from '@mana/db'
import { and, desc, eq, sql } from 'drizzle-orm'
import { instantFieldToWire } from '@api/lib/wire-row'
import { ActivityListResponse } from '@api/modules/activity/responses'

function safeJsonParse(s: string) { try { return JSON.parse(s) } catch { return null } }

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function mapActivityRow(r: typeof activityLogs.$inferSelect) {
  return {
    id: r.id,
    action: r.action,
    summaryKey: r.summaryKey,
    summaryParams: r.summaryParams ? safeJsonParse(r.summaryParams) : null,
    entityType: r.entityType,
    entityId: r.entityId,
    projectId: r.projectId,
    metadata: r.metadata ? safeJsonParse(r.metadata) : null,
    createdAt: instantFieldToWire(r.createdAt)!,
  }
}

function buildActivityQuery(
  userId: string,
  scope: { contactId?: string; projectId?: string },
  entityType?: string,
) {
  const conditions = [eq(activityLogs.userId, userId)]
  if (scope.contactId) conditions.push(eq(activityLogs.contactId, scope.contactId))
  if (scope.projectId) conditions.push(eq(activityLogs.projectId, scope.projectId))
  if (entityType && entityType !== 'all') conditions.push(eq(activityLogs.entityType, entityType))
  return and(...conditions)
}

async function listActivity(
  userId: string,
  scope: { contactId?: string; projectId?: string },
  query: { limit?: number; offset?: number; entityType?: string },
) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT))
  const offset = Math.max(0, query.offset ?? 0)
  const where = buildActivityQuery(userId, scope, query.entityType)

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(activityLogs)
      .where(where)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLogs)
      .where(where),
  ])

  const total = countRows[0]?.count ?? 0

  return {
    data: rows.map(mapActivityRow),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  }
}

const ActivityQuery = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: MAX_LIMIT })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
  entityType: t.Optional(t.String()),
})

export const activityModule = new Elysia({ name: 'activity', prefix: '/api' })
  .use(betterAuthPlugin)

  .get('/activity/contact/:contactId', async ({ params, user, query }) => {
    return listActivity(user.id, { contactId: params.contactId }, {
      limit: query.limit,
      offset: query.offset,
      entityType: query.entityType,
    })
  }, {
    auth: true,
    params: t.Object({ contactId: t.String() }),
    query: ActivityQuery,
    response: { 200: ActivityListResponse },
    detail: { tags: ['Activity'], summary: 'List activity for a contact' },
  })

  .get('/activity/project/:projectId', async ({ params, user, query }) => {
    return listActivity(user.id, { projectId: params.projectId }, {
      limit: query.limit,
      offset: query.offset,
      entityType: query.entityType,
    })
  }, {
    auth: true,
    params: t.Object({ projectId: t.String() }),
    query: ActivityQuery,
    response: { 200: ActivityListResponse },
    detail: { tags: ['Activity'], summary: 'List activity for a project' },
  })
