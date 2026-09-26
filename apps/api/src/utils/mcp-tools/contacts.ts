import { eq, and, desc, inArray, isNull, sum } from 'drizzle-orm'
import { contacts, projects, documents, transactions, activityLogs, users } from '@mana/db'
import { db } from '@api/db'
import { patchContact, deleteContact, listContacts, createContact, getContact, getOutreachQueue, searchContacts as searchContactsService } from '@api/modules/contacts/service'
import { listFilesByEntity } from '@api/utils/mcp-tools/storage'
import { calendarDateFromTimestamp } from '@api/lib/calendar-date'
import { isOpenInvoice } from '@api/lib/document-status'
import { textToTiptapDoc, tiptapDocToText, type TiptapDoc } from '@api/lib/rich-text'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

const EXTERNAL_LIST_DEFAULT_LIMIT = 50
const EXTERNAL_LIST_MAX_LIMIT = 100
const EXTERNAL_NESTED_LIST_LIMIT = 10
const externalLimitSchema = {
  type: 'integer' as const,
  minimum: 1,
  maximum: EXTERNAL_LIST_MAX_LIMIT,
  default: EXTERNAL_LIST_DEFAULT_LIMIT,
  description: 'External MCP response limit. Default 50, maximum 100; the in-app assistant keeps its full context.',
}

interface CreateContactArgs {
  name: string
  role?: string
  company?: string
  email?: string
  phone?: string
}

type ContactFilters = {
  name?: string
  company?: string
  tags?: string[]
  minRelationshipLevel?: number
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

type ExternalContactProjectionInput = {
  id: string
  name: string
  role?: string | null
  company?: string | null
  email?: string | null
  phone?: string | null
  tags?: string[]
  relationshipLevel?: number | null
  stage?: string | null
  dealStatus?: string | null
  lastContactedAt?: string | null
  activeProjectCount?: number
  totalBilledCents?: number
  [key: string]: unknown
}

export function projectExternalMcpContact(contact: ExternalContactProjectionInput) {
  const projection = {
    id: contact.id,
    name: contact.name,
    role: contact.role ?? '',
    company: contact.company ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? null,
    tags: contact.tags ?? [],
    relationshipLevel: contact.relationshipLevel ?? 1,
    stage: contact.stage ?? 'lead',
    dealStatus: contact.dealStatus ?? 'none',
    lastContactedAt: contact.lastContactedAt ?? null,
  }

  return {
    ...projection,
    ...(typeof contact.activeProjectCount === 'number' ? { activeProjectCount: contact.activeProjectCount } : {}),
    ...(typeof contact.totalBilledCents === 'number' ? { totalBilledCents: contact.totalBilledCents } : {}),
  }
}

type ExternalContactActivityProjectionInput = {
  action: string
  summaryKey: string
  entityType: string | null
  createdAt: Date | string | null
  [key: string]: unknown
}

export function projectExternalMcpContactActivity(activity: ExternalContactActivityProjectionInput) {
  return {
    action: activity.action,
    summary: activity.summaryKey,
    entityType: activity.entityType,
    createdAt: activity.createdAt,
  }
}

async function mcpListContacts(userId: string) {
  const rows = await listContacts(userId)
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    company: c.company,
    email: c.email,
    phone: c.phone,
    relationshipLevel: c.relationshipLevel,
    tags: c.tags,
  }))
}

async function mcpListContactsBounded(userId: string, limit: number) {
  const rows = await listContacts(userId, { limit: limit + 1 })
  return {
    items: rows.slice(0, limit).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      company: c.company,
      email: c.email,
      phone: c.phone,
      relationshipLevel: c.relationshipLevel,
      tags: c.tags,
    })),
    limit,
    hasMore: rows.length > limit,
  }
}

async function mcpInsertContact(userId: string, args: CreateContactArgs) {
  const initials = args.name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const contact = await createContact(userId, {
    name: args.name,
    initials,
    role: args.role,
    company: args.company,
    email: args.email,
    phone: args.phone,
    metVia: 'mcp',
  })
  return {
    id: contact.id,
    name: contact.name,
    initials: contact.initials,
    role: contact.role,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
  }
}

function toMcpContact(c: Awaited<ReturnType<typeof searchContactsService>>[number]) {
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    company: c.company,
    email: c.email,
    phone: c.phone,
    relationshipLevel: c.relationshipLevel,
    tags: c.tags,
  }
}

async function searchContacts(
  userId: string,
  filters: ContactFilters,
) {
  const rows = await searchContactsService(userId, filters)
  return rows.map(toMcpContact)
}

async function searchContactsBounded(userId: string, filters: ContactFilters, limit: number) {
  const rows = await searchContactsService(userId, { ...filters, limit: limit + 1 })
  return {
    items: rows.slice(0, limit).map(toMcpContact),
    limit,
    hasMore: rows.length > limit,
  }
}

async function queryContactsByCompany(userId: string, company?: string) {
  const rows = await searchContactsService(userId, { company })
  const filtered = rows.map(toMcpContact)

  const grouped = new Map<string, typeof filtered>()
  for (const c of filtered) {
    const key = c.company || '(no company)'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(c)
  }

  return Array.from(grouped.entries()).map(([comp, contactList]) => ({
    company: comp,
    contacts: contactList,
  }))
}

async function queryContactsByCompanyBounded(userId: string, company: string | undefined, limit: number) {
  const rows = await searchContactsService(userId, { company, limit: limit + 1 })
  const visible = rows.slice(0, limit).map(toMcpContact)
  const grouped = new Map<string, typeof visible>()
  for (const contact of visible) {
    const key = contact.company || '(no company)'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(contact)
  }

  return {
    items: Array.from(grouped.entries()).map(([companyName, contacts]) => ({
      company: companyName,
      contacts,
    })),
    limit,
    hasMore: rows.length > limit,
  }
}

async function suggestOutreach(userId: string, contactId: string, purpose: string, context?: string) {
  const [user, contact] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, userId)).then((r) => r[0]),
    getContact(userId, contactId),
  ])

  if (!contact) return { found: false, message: 'Contact not found' }

  return {
    contactName: contact.name,
    suggestedSubject: `Reaching out — ${purpose}`,
    instructions: [
      `Draft an outreach message to ${contact.name}${contact.role ? `, ${contact.role}` : ''}${contact.company ? ` at ${contact.company}` : ''}.`,
      `Purpose: ${purpose}.`,
      contact.lastContactedAt ? `Last contacted: ${new Date(contact.lastContactedAt).toISOString().slice(0, 10)}.` : 'No recorded contact history.',
      context ? `Additional context: ${context}` : '',
      `Sign as ${user?.name ?? 'the sender'}.`,
    ]
      .filter(Boolean)
      .join(' '),
    note: 'Structured prompt for your assistant — not auto-sent. Paste into your email client or compose in chat.',
  }
}

async function exportContacts(userId: string) {
  const all = await mcpListContacts(userId)
  const fields = ['id', 'name', 'role', 'company', 'email', 'phone', 'relationshipLevel', 'tags']
  const rows = all.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    company: c.company,
    email: c.email,
    phone: c.phone,
    relationshipLevel: c.relationshipLevel,
    tags: (c.tags as string[]).join(', '),
  }))
  return { count: rows.length, fields, rows }
}

async function getContactActivity(userId: string, contactId: string, limit = 50) {
  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      summaryKey: activityLogs.summaryKey,
      summaryParams: activityLogs.summaryParams,
      entityType: activityLogs.entityType,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .where(and(eq(activityLogs.contactId, contactId), eq(activityLogs.userId, userId)))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)

  return rows.map((r) => ({ ...r, createdAt: r.createdAt }))
}

async function getExternalContactActivityBounded(userId: string, contactId: string, limit: number) {
  const rows = await db
    .select({
      action: activityLogs.action,
      summaryKey: activityLogs.summaryKey,
      entityType: activityLogs.entityType,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .where(and(eq(activityLogs.contactId, contactId), eq(activityLogs.userId, userId)))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit + 1)

  return {
    items: rows.slice(0, limit).map(projectExternalMcpContactActivity),
    limit,
    hasMore: rows.length > limit,
  }
}

async function getContactProjects(userId: string, contactId: string, limit?: number) {
  const query = db
    .select({
      id: projects.id,
      name: projects.name,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      archived: projects.archived,
    })
    .from(projects)
    .where(and(eq(projects.contactId, contactId), eq(projects.userId, userId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt))
  const rows = limit === undefined ? await query : await query.limit(limit)

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: p.startDate ?? '',
    dueDate: p.dueDate ?? '',
    archived: p.archived,
  }))
}

async function getContactProjectsBounded(userId: string, contactId: string, limit: number) {
  const rows = await getContactProjects(userId, contactId, limit + 1)
  return {
    items: rows.slice(0, limit),
    limit,
    hasMore: rows.length > limit,
  }
}

async function getContactDocuments(userId: string, contactId: string, limit?: number) {
  const query = db
    .select({
      id: documents.id,
      type: documents.type,
      number: documents.number,
      status: documents.status,
      totalCents: documents.totalCents,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.contactId, contactId), eq(documents.userId, userId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt))
  const rows = limit === undefined ? await query : await query.limit(limit)

  return rows.map((d) => ({
    id: d.id,
    type: d.type,
    number: d.number,
    status: d.status,
    total: d.totalCents / 100,
    createdAt: calendarDateFromTimestamp(d.createdAt),
  }))
}

async function getContactDocumentsBounded(userId: string, contactId: string, limit: number) {
  const rows = await getContactDocuments(userId, contactId, limit + 1)
  return {
    items: rows.slice(0, limit),
    limit,
    hasMore: rows.length > limit,
  }
}

async function getContactTransactions(userId: string, contactId: string) {
  const contactProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.contactId, contactId), eq(projects.userId, userId)))

  const projectIds = contactProjects.map((p) => p.id)
  if (projectIds.length === 0) return { transactions: [], totalRevenue: 0 }

  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.projectId, projectIds)))
    .orderBy(desc(transactions.date))

  const totalRevenue =
    rows.filter((r) => r.type === 'revenue').reduce((s, r) => s + r.amountCents, 0) / 100

  return {
    transactions: rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amountCents / 100,
      description: r.description,
      category: r.category,
      date: r.date,
      status: r.status,
      projectId: r.projectId,
    })),
    totalRevenue,
  }
}

async function getContactTransactionsBounded(userId: string, contactId: string, limit: number) {
  const conditions = and(
    eq(transactions.userId, userId),
    eq(projects.userId, userId),
    eq(projects.contactId, contactId),
  )
  const [revenue] = await db
    .select({ total: sum(transactions.amountCents) })
    .from(transactions)
    .innerJoin(projects, eq(transactions.projectId, projects.id))
    .where(and(conditions, eq(transactions.type, 'revenue')))
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      description: transactions.description,
      category: transactions.category,
      date: transactions.date,
      status: transactions.status,
      projectId: transactions.projectId,
    })
    .from(transactions)
    .innerJoin(projects, eq(transactions.projectId, projects.id))
    .where(conditions)
    .orderBy(desc(transactions.date))
    .limit(limit + 1)

  return {
    items: rows.slice(0, limit).map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amountCents / 100,
      description: row.description,
      category: row.category,
      date: row.date,
      status: row.status,
      projectId: row.projectId,
    })),
    totalRevenue: Number(revenue?.total ?? 0) / 100,
    limit,
    hasMore: rows.length > limit,
  }
}

async function addContactNote(userId: string, contactId: string, note: string) {
  const contact = await getContact(userId, contactId)
  if (!contact) return { success: false, message: 'Contact not found' }

  const timestamp = new Date().toLocaleDateString()
  const entry = textToTiptapDoc(`[${timestamp}] ${note}`)
  if (!entry) return { success: false, message: 'Note is empty' }

  const existing = contact.notes
  const updatedNotes: TiptapDoc = existing
    ? { type: 'doc', content: [...(existing.content ?? []), ...(entry.content ?? [])] }
    : entry

  const updated = await patchContact(userId, contactId, { notes: updatedNotes })
  if (!updated) return { success: false, message: 'Patch failed' }
  return { success: true, notes: tiptapDocToText(updated.notes ?? null) }
}

async function updateRelationshipLevel(userId: string, contactId: string, level: number) {
  if (level < 1 || level > 5) return { success: false, message: 'Level must be between 1 and 5' }
  const updated = await patchContact(userId, contactId, { relationshipLevel: level })
  return updated ?? { success: false, message: 'Contact not found' }
}

async function getContactsWithOpenInvoices(userId: string) {
  const openDocs = await db
    .select({
      id: documents.id,
      contactId: documents.contactId,
      type: documents.type,
      number: documents.number,
      status: documents.status,
      totalCents: documents.totalCents,
      dueDate: documents.dueDate,
    })
    .from(documents)
    .where(and(eq(documents.userId, userId), eq(documents.type, 'INV'), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt))

  const filtered = openDocs.filter((d) => isOpenInvoice(d))

  const grouped = new Map<string, typeof filtered>()
  for (const doc of filtered) {
    const key = doc.contactId ?? '__none__'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(doc)
  }

  const contactIds = Array.from(grouped.keys()).filter((k) => k !== '__none__')
  const contactRows =
    contactIds.length > 0
      ? await db
          .select()
          .from(contacts)
          .where(and(eq(contacts.userId, userId), inArray(contacts.id, contactIds)))
      : []
  const contactMap = new Map(contactRows.map((c) => [c.id, c]))

  return Array.from(grouped.entries())
    .filter(([key]) => key !== '__none__')
    .map(([contactId, invoices]) => {
      const row = contactMap.get(contactId)
      const totalOwed = invoices.reduce((s, d) => s + d.totalCents, 0) / 100
      return {
        contact: row
          ? { id: row.id, name: row.name, email: row.email ?? '' }
          : { id: contactId, name: 'Unknown', email: '' },
        openInvoices: invoices.map((d) => ({
          id: d.id,
          number: d.number,
          status: d.status,
          total: d.totalCents / 100,
          dueDate: d.dueDate ?? '',
        })),
        totalOwed,
      }
    })
    .sort((a, b) => b.totalOwed - a.totalOwed)
}

async function getContactsWithOpenInvoicesBounded(userId: string, limit: number) {
  const rows = await getContactsWithOpenInvoices(userId)
  return {
    items: rows.slice(0, limit).map((row) => ({
      ...row,
      openInvoiceCount: row.openInvoices.length,
      openInvoices: row.openInvoices.slice(0, EXTERNAL_NESTED_LIST_LIMIT),
      hasMoreInvoices: row.openInvoices.length > EXTERNAL_NESTED_LIST_LIMIT,
    })),
    limit,
    hasMore: rows.length > limit,
  }
}

async function summarizeContact(userId: string, contactId: string) {
  const contact = await getContact(userId, contactId)
  if (!contact) return { found: false, message: 'Contact not found' }

  const [contactProjectsResult, recentActivityResult, txResult, openDocsResult] = await Promise.all([
    getContactProjects(userId, contactId),
    getContactActivity(userId, contactId, 5),
    getContactTransactions(userId, contactId),
    db
      .select({ id: documents.id, status: documents.status, dueDate: documents.dueDate })
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          eq(documents.contactId, contactId),
          eq(documents.type, 'INV'),
          isNull(documents.deletedAt),
        ),
      ),
  ])

  const hasOpenInvoices = openDocsResult.some((d) => isOpenInvoice({ type: 'INV', status: d.status }))

  const latestActivity =
    recentActivityResult.length > 0
      ? new Date(recentActivityResult[0]!.createdAt)
      : contact.lastContactedAt
        ? new Date(contact.lastContactedAt)
        : null

  const daysSinceLastContact = latestActivity
    ? Math.floor((Date.now() - latestActivity.getTime()) / 86_400_000)
    : null

  let recommendedAction: string
  if (daysSinceLastContact !== null && daysSinceLastContact > 60) {
    recommendedAction = 'Schedule a check-in'
  } else if (hasOpenInvoices) {
    recommendedAction = 'Follow up on payment'
  } else if (contactProjectsResult.length === 0) {
    recommendedAction = 'Discuss new project'
  } else {
    recommendedAction = 'Relationship in good standing'
  }

  return {
    contact,
    projects: contactProjectsResult,
    recentActivity: recentActivityResult,
    totalRevenue: txResult.totalRevenue,
    daysSinceLastContact,
    recommendedAction,
    stage: contact.stage,
    dealStatus: contact.dealStatus,
    lastContactedAt: contact.lastContactedAt,
  }
}

async function summarizeExternalContact(userId: string, contactId: string, limit: number) {
  const summary = await summarizeContact(userId, contactId)
  if (!summary.contact || !Array.isArray(summary.projects) || !Array.isArray(summary.recentActivity)) return summary

  return {
    contact: projectExternalMcpContact(summary.contact),
    projects: summary.projects.slice(0, limit).map((project) => ({
      id: project.id,
      name: project.name,
      startDate: project.startDate,
      dueDate: project.dueDate,
      archived: project.archived,
    })),
    projectsLimit: limit,
    projectsHasMore: summary.projects.length > limit,
    recentActivity: summary.recentActivity.map(projectExternalMcpContactActivity),
    totalRevenue: summary.totalRevenue,
    daysSinceLastContact: summary.daysSinceLastContact,
    recommendedAction: summary.recommendedAction,
    stage: summary.stage,
    dealStatus: summary.dealStatus,
    lastContactedAt: summary.lastContactedAt,
  }
}

export const contactTools = [
  {
    name: 'get_contacts',
    description: 'List contacts with relationship details. External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: {
      type: 'object' as const,
      properties: { limit: externalLimitSchema },
      required: [],
    },
  },
  {
    name: 'get_contact',
    description: 'Get a contact by ID. External MCP returns only the safe workflow profile and basic stats.',
    input_schema: {
      type: 'object' as const,
      properties: { contactId: { type: 'string' } },
      required: ['contactId'],
    },
  },
  {
    name: 'create_contact',
    description: 'Create a new contact in the user\'s network',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        role: { type: 'string' },
        company: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_contact',
    description: 'Update fields on an existing contact (name, role, company, email, phone, website, relationshipLevel, tags, stage, dealValue, dealStatus, imageUrl)',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
        company: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        website: { type: 'string' },
        color: { type: 'string', description: 'Hex color e.g. #D4A843' },
        relationshipLevel: { type: 'number', description: '1–5 relationship level' },
        tags: { type: 'array', items: { type: 'string' } },
        stage: { type: 'string', enum: ['lead', 'prospect', 'client', 'recurring', 'churned'] },
        dealValue: { type: 'string', description: 'Deal value as a string, e.g. "5000"' },
        dealStatus: { type: 'string', enum: ['none', 'open', 'won', 'lost'] },
        imageUrl: { type: 'string', description: 'Contact photo URL' },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'delete_contact',
    description: 'Permanently delete a contact — this action cannot be undone',
    input_schema: {
      type: 'object' as const,
      properties: { contactId: { type: 'string' } },
      required: ['contactId'],
    },
  },
  {
    name: 'search_contacts',
    description: 'Filter contacts by optional criteria: name substring, company substring, tags (match any), or minimum relationship level. External MCP returns a bounded result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Case-insensitive substring match on name' },
        company: { type: 'string', description: 'Case-insensitive substring match on company' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Match contacts that have any of these tags' },
        minRelationshipLevel: { type: 'number', description: '1–5' },
        limit: externalLimitSchema,
      },
      required: [],
    },
  },
  {
    name: 'get_contacts_by_company',
    description: 'Group contacts by company name, optionally filtered by company substring. External MCP returns a bounded result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company: { type: 'string', description: 'Optional substring to filter companies' },
        limit: externalLimitSchema,
      },
      required: [],
    },
  },
  {
    name: 'suggest_outreach',
    description: 'Return a structured outreach prompt for a contact, incorporating their profile and recent timeline history',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string' },
        purpose: { type: 'string', description: 'What the outreach should accomplish' },
        context: { type: 'string', description: 'Additional context' },
      },
      required: ['contactId', 'purpose'],
    },
  },
  {
    name: 'export_contacts',
    description: 'Export all contacts as flat CSV-ready data (tags serialized as comma-separated string)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_contact_activity',
    description: 'Get a contact activity history. External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string' },
        limit: externalLimitSchema,
      },
      required: ['contactId'],
    },
  },
  {
    name: 'get_contact_projects',
    description: 'List projects linked to a contact. External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: {
      type: 'object' as const,
      properties: { contactId: { type: 'string' }, limit: externalLimitSchema },
      required: ['contactId'],
    },
  },
  {
    name: 'get_contact_documents',
    description: 'List invoices, proposals, and quotes sent to a contact. External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: {
      type: 'object' as const,
      properties: { contactId: { type: 'string' }, limit: externalLimitSchema },
      required: ['contactId'],
    },
  },
  {
    name: 'get_contact_transactions',
    description: 'Get financial transactions associated with a contact, including total revenue. External MCP returns a bounded result.',
    input_schema: {
      type: 'object' as const,
      properties: { contactId: { type: 'string' }, limit: externalLimitSchema },
      required: ['contactId'],
    },
  },
  {
    name: 'add_contact_note',
    description: 'Add a note to a contact — appends to existing notes with timestamp',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string' },
        note: { type: 'string', description: 'The note to add' },
      },
      required: ['contactId', 'note'],
    },
  },
  {
    name: 'update_relationship_level',
    description: 'Set the relationship level (1=New Contact, 2=Acquaintance, 3=Working Relationship, 4=Close Collaborator, 5=Trusted Partner)',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string' },
        level: { type: 'number', description: '1 to 5' },
      },
      required: ['contactId', 'level'],
    },
  },
  {
    name: 'get_contacts_with_open_invoices',
    description: 'Get contacts who have open invoices. External MCP returns a bounded result and at most ten invoice rows per contact.',
    input_schema: {
      type: 'object' as const,
      properties: { limit: externalLimitSchema },
      required: [],
    },
  },
  {
    name: 'summarize_contact',
    description: 'Generate a contact summary with projects, revenue, relationship history, and recommended next action. External MCP bounds the project list.',
    input_schema: {
      type: 'object' as const,
      properties: { contactId: { type: 'string' }, limit: externalLimitSchema },
      required: ['contactId'],
    },
  },
  {
    name: 'list_files_for_contact',
    description: 'List files linked to a contact. External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: {
      type: 'object' as const,
      properties: { contactId: { type: 'string' }, limit: externalLimitSchema },
      required: ['contactId'],
    },
  },
  {
    name: 'get_outreach_queue',
    description: 'Return up to 20 contacts due for outreach — those not contacted in the last N days (default 30), excluding churned contacts. Sorted by relationship level desc, then oldest contact first.',
    input_schema: {
      type: 'object' as const,
      properties: { days: { type: 'number', description: 'Inactivity threshold in days (default 30)' } },
      required: [],
    },
  },
] as const

export const contactHandlers: Record<string, McpToolHandler> = {
  'get_contacts': (userId, args, context) => {
    const limit = externalListLimit(args, context)
    return limit === null ? mcpListContacts(userId) : mcpListContactsBounded(userId, limit)
  },
  'get_contact': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('get_contact requires contactId')
    const contact = await getContact(userId, args.contactId)
    if (!contact) return { found: false, message: 'Contact not found' }
    return context?.source === 'external-mcp' ? projectExternalMcpContact(contact) : contact
  },
  'create_contact': async (userId, args) => {
    if (typeof args.name !== 'string') throw new Error('create_contact requires name string')
    return mcpInsertContact(userId, {
      name: args.name,
      role: typeof args.role === 'string' ? args.role : undefined,
      company: typeof args.company === 'string' ? args.company : undefined,
      email: typeof args.email === 'string' ? args.email : undefined,
      phone: typeof args.phone === 'string' ? args.phone : undefined,
    })
  },
  'update_contact': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('update_contact requires contactId')
    if (typeof args.relationshipLevel === 'number' && (args.relationshipLevel < 1 || args.relationshipLevel > 5)) {
      throw new Error('update_contact requires relationshipLevel between 1 and 5')
    }
    const updated = await patchContact(userId, args.contactId, {
      name: typeof args.name === 'string' ? args.name : undefined,
      role: typeof args.role === 'string' ? args.role : undefined,
      company: typeof args.company === 'string' ? args.company : undefined,
      email: typeof args.email === 'string' ? args.email : undefined,
      phone: typeof args.phone === 'string' ? args.phone : undefined,
      website: typeof args.website === 'string' ? args.website : undefined,
      color: typeof args.color === 'string' ? args.color : undefined,
      relationshipLevel: typeof args.relationshipLevel === 'number' ? args.relationshipLevel : undefined,
      tags: Array.isArray(args.tags) ? args.tags as string[] : undefined,
      stage: typeof args.stage === 'string' ? args.stage : undefined,
      dealValue: typeof args.dealValue === 'string' ? args.dealValue : undefined,
      dealStatus: typeof args.dealStatus === 'string' ? args.dealStatus : undefined,
      imageUrl: typeof args.imageUrl === 'string' ? args.imageUrl : undefined,
    })
    if (!updated) return { updated: false, message: 'Contact not found' }
    return context?.source === 'external-mcp' ? projectExternalMcpContact(updated) : updated
  },
  'delete_contact': async (userId, args) => {
    if (typeof args.contactId !== 'string') throw new Error('delete_contact requires contactId')
    await deleteContact(userId, args.contactId)
    return { deleted: true, contactId: args.contactId }
  },
  'search_contacts': async (userId, args, context) => {
    const filters = {
      name: typeof args.name === 'string' ? args.name : undefined,
      company: typeof args.company === 'string' ? args.company : undefined,
      tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
      minRelationshipLevel: typeof args.minRelationshipLevel === 'number' ? args.minRelationshipLevel : undefined,
    }
    const limit = externalListLimit(args, context)
    return limit === null ? searchContacts(userId, filters) : searchContactsBounded(userId, filters, limit)
  },
  'get_contacts_by_company': async (userId, args, context) => {
    const company = typeof args.company === 'string' ? args.company : undefined
    const limit = externalListLimit(args, context)
    return limit === null
      ? queryContactsByCompany(userId, company)
      : queryContactsByCompanyBounded(userId, company, limit)
  },
  'suggest_outreach': async (userId, args) => {
    if (typeof args.contactId !== 'string') throw new Error('suggest_outreach requires contactId')
    if (typeof args.purpose !== 'string') throw new Error('suggest_outreach requires purpose')
    return suggestOutreach(userId, args.contactId, args.purpose, typeof args.context === 'string' ? args.context : undefined)
  },
  'export_contacts': (userId, _args, context) => {
    if (context?.source === 'external-mcp') {
      throw new Error('export_contacts is only available in the MANA app')
    }
    return exportContacts(userId)
  },
  'get_contact_activity': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('get_contact_activity requires contactId')
    const limit = externalListLimit(args, context)
    return limit === null
      ? getContactActivity(userId, args.contactId, typeof args.limit === 'number' ? args.limit : 50)
      : getExternalContactActivityBounded(userId, args.contactId, limit)
  },
  'get_contact_projects': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('get_contact_projects requires contactId')
    const limit = externalListLimit(args, context)
    return limit === null
      ? getContactProjects(userId, args.contactId)
      : getContactProjectsBounded(userId, args.contactId, limit)
  },
  'get_contact_documents': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('get_contact_documents requires contactId')
    const limit = externalListLimit(args, context)
    return limit === null
      ? getContactDocuments(userId, args.contactId)
      : getContactDocumentsBounded(userId, args.contactId, limit)
  },
  'get_contact_transactions': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('get_contact_transactions requires contactId')
    const limit = externalListLimit(args, context)
    return limit === null
      ? getContactTransactions(userId, args.contactId)
      : getContactTransactionsBounded(userId, args.contactId, limit)
  },
  'add_contact_note': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('add_contact_note requires contactId')
    if (typeof args.note !== 'string') throw new Error('add_contact_note requires note')
    const result = await addContactNote(userId, args.contactId, args.note)
    return context?.source === 'external-mcp'
      ? { success: result.success, contactId: args.contactId }
      : result
  },
  'update_relationship_level': async (userId, args) => {
    if (typeof args.contactId !== 'string') throw new Error('update_relationship_level requires contactId')
    if (typeof args.level !== 'number') throw new Error('update_relationship_level requires level')
    return updateRelationshipLevel(userId, args.contactId, args.level)
  },
  'get_contacts_with_open_invoices': (userId, args, context) => {
    const limit = externalListLimit(args, context)
    return limit === null ? getContactsWithOpenInvoices(userId) : getContactsWithOpenInvoicesBounded(userId, limit)
  },
  'summarize_contact': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('summarize_contact requires contactId')
    const limit = externalListLimit(args, context)
    return limit === null
      ? summarizeContact(userId, args.contactId)
      : summarizeExternalContact(userId, args.contactId, limit)
  },
  'list_files_for_contact': async (userId, args, context) => {
    if (typeof args.contactId !== 'string') throw new Error('list_files_for_contact requires contactId')
    const limit = externalListLimit(args, context)
    if (limit === null) return listFilesByEntity(userId, 'contact', args.contactId)
    const rows = await listFilesByEntity(userId, 'contact', args.contactId, limit + 1)
    return {
      items: rows.slice(0, limit),
      limit,
      hasMore: rows.length > limit,
    }
  },
  'get_outreach_queue': async (userId, args, context) => {
    const queue = await getOutreachQueue(userId, typeof args.days === 'number' ? args.days : 30)
    return context?.source === 'external-mcp'
      ? queue.map((contact) => ({ ...projectExternalMcpContact(contact), daysSinceContact: contact.daysSinceContact }))
      : queue
  },
}
