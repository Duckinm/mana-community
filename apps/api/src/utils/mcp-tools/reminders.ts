import { eq, and, desc, gte, lte } from 'drizzle-orm'
import { emailLogs } from '@mana/db'
import { db } from '@api/db'
import { sendReminders } from '@api/modules/reminders/service'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

const EXTERNAL_LIST_DEFAULT_LIMIT = 50
const EXTERNAL_LIST_MAX_LIMIT = 100
const externalLimitSchema = {
  type: 'integer' as const,
  minimum: 1,
  maximum: EXTERNAL_LIST_MAX_LIMIT,
  default: EXTERNAL_LIST_DEFAULT_LIMIT,
  description: 'External MCP response limit. Default 50, maximum 100; the in-app assistant keeps its full context.',
}

function externalListLimit(args: Record<string, unknown>, context?: ToolContext) {
  if (context?.source !== 'external-mcp') return null
  const value = args.limit
  if (value === undefined) return EXTERNAL_LIST_DEFAULT_LIMIT
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > EXTERNAL_LIST_MAX_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${EXTERNAL_LIST_MAX_LIMIT}`)
  }
  return value
}

async function getEmailLogs(
  userId: string,
  filters: { type?: string; status?: string; from?: string; to?: string },
  limit?: number,
) {
  const conditions = [eq(emailLogs.userId, userId)]
  if (filters.type) conditions.push(eq(emailLogs.type, filters.type))
  if (filters.status) conditions.push(eq(emailLogs.status, filters.status))
  if (filters.from) conditions.push(gte(emailLogs.sentAt, new Date(filters.from)))
  if (filters.to) conditions.push(lte(emailLogs.sentAt, new Date(filters.to)))

  const query = db
    .select()
    .from(emailLogs)
    .where(and(...conditions))
    .orderBy(desc(emailLogs.sentAt))
  const rows = limit === undefined ? await query : await query.limit(limit)

  return rows.map((row) => ({
    id: row.id,
    recipient: row.recipient,
    subject: row.subject,
    type: row.type,
    referenceId: row.referenceId ?? undefined,
    status: row.status,
    sentAt: row.sentAt,
  }))
}

async function getEmailLogsBounded(
  userId: string,
  filters: { type?: string; status?: string; from?: string; to?: string },
  limit: number,
) {
  const rows = await getEmailLogs(userId, filters, limit + 1)
  return {
    items: rows.slice(0, limit),
    limit,
    hasMore: rows.length > limit,
  }
}

export const reminderTools = [
  {
    name: 'send_reminder',
    description: 'Send payment reminders for invoices owned by the current user. Recipient and amount data are loaded from each document.',
    input_schema: {
      type: 'object' as const,
      properties: {
        documentIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Invoice document IDs to remind',
        },
      },
      required: ['documentIds'],
    },
  },
  {
    name: 'get_email_logs',
    description: 'Return the sent-email log (recipient, subject, type, sentAt, status). External MCP returns a bounded { items, limit, hasMore } result. Optionally filter by type, status, and sentAt date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', description: 'Filter by email type, e.g. "document_sent" or "invoice_reminder"' },
        status: { type: 'string', description: 'Filter by status: "sent", "blocked", or "failed"' },
        from: { type: 'string', description: 'ISO datetime; only logs sent on or after this time' },
        to: { type: 'string', description: 'ISO datetime; only logs sent on or before this time' },
        limit: externalLimitSchema,
      },
      required: [],
    },
  },
] as const

export const reminderHandlers: Record<string, McpToolHandler> = {
  'send_reminder': async (userId, args) => {
    if (!Array.isArray(args.documentIds) || !args.documentIds.every((id) => typeof id === 'string')) {
      throw new Error('send_reminder requires documentIds: string[]')
    }
    const results = await sendReminders(userId, args.documentIds as string[])
    return { results }
  },
  'get_email_logs': async (userId, args, context) => {
    const filters = {
      type: typeof args.type === 'string' ? args.type : undefined,
      status: typeof args.status === 'string' ? args.status : undefined,
      from: typeof args.from === 'string' ? args.from : undefined,
      to: typeof args.to === 'string' ? args.to : undefined,
    }
    const limit = externalListLimit(args, context)
    return limit === null
      ? getEmailLogs(userId, filters)
      : getEmailLogsBounded(userId, filters, limit)
  },
}
