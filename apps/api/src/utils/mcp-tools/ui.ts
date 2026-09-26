import { and, eq, isNull } from 'drizzle-orm'
import { contacts, documents, projects, tasks, transactions } from '@mana/db'
import { db } from '@api/db'

type McpToolHandler = (userId: string, args: Record<string, unknown>) => Promise<unknown>

type UiAction =
  | { action: 'open_overlay'; entity: 'contact'; id: string }
  | { action: 'open_overlay'; entity: 'project'; id: string }
  | { action: 'open_overlay'; entity: 'document'; id: string }
  | { action: 'open_overlay'; entity: 'task'; id: string; projectId: string }
  | { action: 'open_overlay'; entity: 'transaction'; id: string }

async function openView(userId: string, args: Record<string, unknown>) {
  const view = args.view
  if (typeof view !== 'string') throw new Error('open_view requires view')

  let uiAction: UiAction

  switch (view) {
    case 'contact': {
      const contactId = args.contactId
      if (typeof contactId !== 'string') throw new Error('open_view contact requires contactId')
      const [row] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
      if (!row) return { ok: false, message: 'Contact not found' }
      uiAction = { action: 'open_overlay', entity: 'contact', id: contactId }
      break
    }
    case 'project': {
      const projectId = args.projectId
      if (typeof projectId !== 'string') throw new Error('open_view project requires projectId')
      const [row] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.userId, userId), eq(projects.id, projectId), isNull(projects.deletedAt)))
      if (!row) return { ok: false, message: 'Project not found' }
      uiAction = { action: 'open_overlay', entity: 'project', id: projectId }
      break
    }
    case 'document': {
      const documentId = args.documentId
      if (typeof documentId !== 'string') throw new Error('open_view document requires documentId')
      const [row] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.userId, userId), eq(documents.id, documentId), isNull(documents.deletedAt)))
      if (!row) return { ok: false, message: 'Document not found' }
      uiAction = { action: 'open_overlay', entity: 'document', id: documentId }
      break
    }
    case 'task': {
      const projectId = args.projectId
      const taskId = args.taskId
      if (typeof projectId !== 'string' || typeof taskId !== 'string') {
        throw new Error('open_view task requires projectId and taskId')
      }
      const [row] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.projectId, projectId), eq(tasks.id, taskId)))
      if (!row) return { ok: false, message: 'Task not found' }
      uiAction = { action: 'open_overlay', entity: 'task', id: taskId, projectId }
      break
    }
    case 'transaction': {
      const transactionId = args.transactionId
      if (typeof transactionId !== 'string') throw new Error('open_view transaction requires transactionId')
      const [row] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.id, transactionId)))
      if (!row) return { ok: false, message: 'Transaction not found' }
      uiAction = { action: 'open_overlay', entity: 'transaction', id: transactionId }
      break
    }
    default:
      throw new Error(`open_view: unknown view "${view}"`)
  }

  return { ok: true, uiAction }
}

export const uiTools = [
  {
    name: 'open_view',
    description:
      'Open a visual detail popup in the chat UI so the user can review or edit an entity. Use when the user asks to see, open, show, or edit a specific contact, project, document, or task. Prefer inline widgets for lists and summaries; use open_view for full detail views.',
    input_schema: {
      type: 'object' as const,
      properties: {
        view: {
          type: 'string',
          enum: ['contact', 'project', 'document', 'task', 'transaction'],
          description: 'Entity type to open',
        },
        contactId: { type: 'string', description: 'Required when view is contact' },
        projectId: { type: 'string', description: 'Required when view is project or task' },
        documentId: { type: 'string', description: 'Required when view is document' },
        taskId: { type: 'string', description: 'Required when view is task' },
        transactionId: { type: 'string', description: 'Required when view is transaction' },
      },
      required: ['view'],
    },
  },
] as const

export const uiHandlers: Record<string, McpToolHandler> = {
  open_view: openView,
}
