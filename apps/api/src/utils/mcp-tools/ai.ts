import { eq } from 'drizzle-orm'
import { users } from '@mana/db'
import { db } from '@api/db'
import { generateTasksFromBrief, generateOutreachDraft, breakDownTask, generateFinanceNarrative } from '@api/modules/ai/service'
import { getSessions, createSession, deleteSession, updateSessionTitle, updateSessionPinned, searchSessions } from '@api/modules/chat/sessions'
import { getContact, getOutreachQueue } from '@api/modules/contacts/service'
import { getDashboardSnapshot } from '@api/utils/mcp-tools/finance'
import { getOverdueInvoices } from '@api/utils/mcp-tools/documents'
import { getOverdueTasks, getTasksDueThisWeek } from '@api/utils/mcp-tools/projects'

type McpToolHandler = (userId: string, args: Record<string, unknown>) => Promise<unknown>

async function draftEmail(userId: string, args: { to: string; purpose: string; context?: string }) {
  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))

  return {
    draft: true,
    to: args.to,
    suggestedSubject: `Follow-up from ${user?.name ?? 'MANA'}`,
    instructions: `Draft an email to ${args.to} for the following purpose: ${args.purpose}. ${args.context ?? ''} Sign as ${user?.name ?? ''}.`,
    note: 'Structured prompt for your assistant (not auto-sent). Paste into your email client or let the in-app chat compose the final text.',
  }
}

async function buildWeeklyDigest(userId: string) {
  const [snapshot, overdueTasks, tasksDueThisWeek, overdueInvoices, outreachQueue] = await Promise.all([
    getDashboardSnapshot(userId),
    getOverdueTasks(userId),
    getTasksDueThisWeek(userId),
    getOverdueInvoices(userId),
    getOutreachQueue(userId, 30),
  ])

  return {
    snapshot,
    overdueTasks,
    tasksDueThisWeek,
    overdueInvoices,
    outreachQueue,
  }
}

export const aiTools = [
  {
    name: 'draft_email',
    description: 'Build a subject line and a human-readable prompt to paste into an email client (not an auto-generated body)',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient name or email' },
        purpose: { type: 'string', description: 'What the email should accomplish' },
        context: { type: 'string', description: 'Additional context, e.g. project name, invoice amount' },
      },
      required: ['to', 'purpose'],
    },
  },
  {
    name: 'generate_tasks',
    description: 'Generate a list of actionable tasks for a project from a plain-text brief (uses Claude). Returns suggested tasks — does not create them. Use bulk_create_tasks to save the ones the user wants.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project to generate tasks for' },
        brief: { type: 'string', maxLength: 12000, description: 'Plain-text description of the work to be done (max 12,000 characters)' },
      },
      required: ['projectId', 'brief'],
    },
  },
  {
    name: 'break_down_task',
    description: 'Break a task into 3-8 concrete subtask checklist items (uses Claude). Returns suggested checklist items — does not save them.',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskTitle: { type: 'string', maxLength: 500 },
        taskDescription: { type: 'string', maxLength: 8000, description: 'Optional additional context about the task (max 8,000 characters)' },
      },
      required: ['taskTitle'],
    },
  },
  {
    name: 'outreach_draft',
    description: 'Compose a full outreach email (subject + body) for a contact, tailored to a purpose (uses Claude)',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string', description: 'Contact to write to' },
        purpose: { type: 'string', maxLength: 1000, description: 'What the email should accomplish, e.g. "re-engage after 3 months silence"' },
        context: { type: 'string', maxLength: 8000, description: 'Additional context to include, e.g. recent project details (max 8,000 characters)' },
      },
      required: ['contactId', 'purpose'],
    },
  },
  {
    name: 'finance_narrative',
    description: 'Get an AI-written plain-English summary of cash flow health: headline, narrative, and key insights (uses Claude)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'weekly_digest',
    description: 'Cross-domain briefing data for the week: dashboard snapshot, overdue tasks, tasks due this week, overdue invoices, and contacts due for outreach. Use this to compose a weekly summary for the user.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'list_chat_sessions',
    description: 'List all chat sessions for the user, ordered by pinned then most recently updated',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_chat_session',
    description: 'Create a new chat session with an optional title',
    input_schema: {
      type: 'object' as const,
      properties: { title: { type: 'string', description: 'Session title (defaults to "New Chat")' } },
      required: [],
    },
  },
  {
    name: 'delete_chat_session',
    description: 'Delete a chat session and all its messages',
    input_schema: {
      type: 'object' as const,
      properties: { sessionId: { type: 'string' } },
      required: ['sessionId'],
    },
  },
  {
    name: 'rename_chat_session',
    description: 'Rename a chat session',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['sessionId', 'title'],
    },
  },
  {
    name: 'pin_chat_session',
    description: 'Pin or unpin a chat session',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string' },
        pinned: { type: 'boolean' },
      },
      required: ['sessionId', 'pinned'],
    },
  },
  {
    name: 'search_chat_sessions',
    description: 'Search chat sessions by message content, returns one result per session with a snippet',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
] as const

export const aiHandlers: Record<string, McpToolHandler> = {
  'draft_email': async (userId, args) => {
    if (typeof args.to !== 'string' || typeof args.purpose !== 'string') {
      throw new Error('draft_email requires to and purpose strings')
    }
    return draftEmail(userId, {
      to: args.to,
      purpose: args.purpose,
      context: typeof args.context === 'string' ? args.context : undefined,
    })
  },
  'generate_tasks': async (userId, args) => {
    if (typeof args.projectId !== 'string' || typeof args.brief !== 'string') {
      throw new Error('generate_tasks requires projectId and brief strings')
    }
    return generateTasksFromBrief(userId, args.projectId, args.brief)
  },
  'break_down_task': async (userId, args) => {
    if (typeof args.taskTitle !== 'string') throw new Error('break_down_task requires taskTitle string')
    return breakDownTask(userId, args.taskTitle, typeof args.taskDescription === 'string' ? args.taskDescription : '')
  },
  'outreach_draft': async (userId, args) => {
    if (typeof args.contactId !== 'string' || typeof args.purpose !== 'string') {
      throw new Error('outreach_draft requires contactId and purpose strings')
    }
    const contact = await getContact(userId, args.contactId)
    if (!contact) throw new Error('Contact not found')
    return generateOutreachDraft(userId, contact.name, args.purpose, typeof args.context === 'string' ? args.context : '')
  },
  'finance_narrative': (userId) => generateFinanceNarrative(userId),
  'weekly_digest': (userId) => buildWeeklyDigest(userId),
  'list_chat_sessions': (userId) => getSessions(userId),
  'create_chat_session': async (userId, args) => createSession(userId, typeof args.title === 'string' ? args.title : undefined),
  'delete_chat_session': async (userId, args) => {
    if (typeof args.sessionId !== 'string') throw new Error('delete_chat_session requires sessionId')
    const result = await deleteSession(userId, args.sessionId)
    return result ?? { success: false, message: 'Session not found' }
  },
  'rename_chat_session': async (userId, args) => {
    if (typeof args.sessionId !== 'string' || typeof args.title !== 'string') throw new Error('rename_chat_session requires sessionId and title')
    const result = await updateSessionTitle(userId, args.sessionId, args.title)
    return result ?? { success: false, message: 'Session not found' }
  },
  'pin_chat_session': async (userId, args) => {
    if (typeof args.sessionId !== 'string' || typeof args.pinned !== 'boolean') throw new Error('pin_chat_session requires sessionId and pinned')
    const result = await updateSessionPinned(userId, args.sessionId, args.pinned)
    return result ?? { success: false, message: 'Session not found' }
  },
  'search_chat_sessions': async (userId, args) => {
    if (typeof args.query !== 'string') throw new Error('search_chat_sessions requires query')
    return searchSessions(userId, args.query)
  },
}
