import { db } from '@api/db'
import { contacts, projects, documents, activityLogs, transactions } from '@mana/db'
import { normalizeTiptapDoc, textToTiptapDoc, type TiptapDoc } from '@api/lib/rich-text'
import { eq, and, asc, desc, inArray, isNull, lt, lte, gte, ilike, or, sum } from 'drizzle-orm'
import { logContactCreated, logContactUpdated, logContactDeleted, logContactMerged } from '@api/lib/activity'
import { buildContactPatchActivity } from '@api/lib/activity-helpers'
import { calendarDateFromTimestamp } from '@api/lib/calendar-date'
import { instantFieldToWire } from '@api/lib/wire-row'
import { instantToIso } from '@api/lib/instant'
import { isOpenInvoice } from '@api/lib/document-status'
import { createNotification } from '@api/modules/notifications/create'

function buildContact(row: typeof contacts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    role: row.role ?? '',
    company: row.company ?? '',
    email: row.email ?? '',
    website: row.website ?? '',
    color: row.color ?? '#D4A843',
    tags: JSON.parse(row.tags ?? '[]') as string[],
    relationshipLevel: (row.relationshipLevel ?? 1) as 1 | 2 | 3 | 4 | 5,
    metVia: row.metVia ?? 'Direct',
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    imageUrl: row.imageUrl ?? null,
    stage: row.stage ?? 'lead',
    dealValue: row.dealValue ?? null,
    dealStatus: row.dealStatus ?? 'none',
    lastContactedAt: instantFieldToWire(row.lastContactedAt),
    entityType: row.entityType,
    nameTh: row.nameTh ?? null,
    addressTh: row.addressTh ?? null,
    taxId: row.taxId ?? null,
    branchNumber: row.branchNumber ?? null,
    zip: row.zip ?? null,
    country: row.country ?? null,
    address: row.address ?? null,
    nationalId: row.nationalId ?? null,
    companyNameEn: row.companyNameEn ?? null,
    companyNameTh: row.companyNameTh ?? null,
    companyAddress: row.companyAddress ?? null,
    companyAddressTh: row.companyAddressTh ?? null,
    companyZip: row.companyZip ?? null,
    companyCountry: row.companyCountry ?? null,
    createdAt: calendarDateFromTimestamp(row.createdAt),
  }
}

async function getContactTotalBilledCents(userId: string, contactId: string) {
  const [result] = await db
    .select({ total: sum(documents.totalCents) })
    .from(documents)
    .innerJoin(transactions, eq(transactions.documentId, documents.id))
    .where(and(
      eq(documents.userId, userId),
      eq(documents.contactId, contactId),
      eq(documents.type, 'RC'),
      isNull(documents.deletedAt),
    ))
  return Number(result?.total ?? 0)
}

async function getContactLinkedProjects(userId: string, contactId: string) {
  return db
    .select({ id: projects.id, name: projects.name, archived: projects.archived })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.contactId, contactId), isNull(projects.deletedAt)))
    .orderBy(asc(projects.name))
}

async function buildContactWithStats(row: typeof contacts.$inferSelect, userId: string) {
  const base = buildContact(row)

  const [totalBilledCents, linkedProjects] = await Promise.all([
    getContactTotalBilledCents(userId, row.id),
    getContactLinkedProjects(userId, row.id),
  ])

  const activeProjectCount = linkedProjects.filter((p) => !p.archived).length

  return {
    ...base,
    totalBilledCents,
    activeProjectCount,
    linkedProjects: linkedProjects.map((p) => ({
      id: p.id,
      name: p.name,
      archived: p.archived,
    })),
  }
}

export async function listContacts(userId: string, options?: { limit?: number }) {
  const query = db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, userId))
    .orderBy(asc(contacts.name))
  const rows = options?.limit === undefined ? await query : await query.limit(options.limit)
  return Promise.all(rows.map((row) => buildContactWithStats(row, userId)))
}

export interface ContactSearchFilters {
  name?: string
  company?: string
  tags?: string[]
  minRelationshipLevel?: number
  maxRelationshipLevel?: number
  limit?: number
}

/**
 * Filter contacts in SQL. The single owner of contact search — MCP tools call
 * this and map to their DTO rather than fetching every contact and filtering
 * in memory. `tags` stays a JS filter: it's a JSON-string column with no clean
 * SQL containment path.
 */
export async function searchContacts(userId: string, filters: ContactSearchFilters) {
  const conditions = [eq(contacts.userId, userId)]
  if (filters.name) conditions.push(ilike(contacts.name, `%${filters.name}%`))
  if (filters.company) conditions.push(ilike(contacts.company, `%${filters.company}%`))
  if (filters.minRelationshipLevel != null) conditions.push(gte(contacts.relationshipLevel, filters.minRelationshipLevel))
  if (filters.maxRelationshipLevel != null) conditions.push(lte(contacts.relationshipLevel, filters.maxRelationshipLevel))

  const query = db
    .select()
    .from(contacts)
    .where(and(...conditions))
    .orderBy(asc(contacts.name))
  const rows = filters.limit === undefined || filters.tags?.length
    ? await query
    : await query.limit(filters.limit)

  const built = rows.map(buildContact)
  const filtered = !filters.tags || filters.tags.length === 0
    ? built
    : built.filter((c) => filters.tags!.some((t) => c.tags.includes(t)))
  return filters.limit === undefined ? filtered : filtered.slice(0, filters.limit)
}

export async function getContact(userId: string, contactId: string) {
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.id, contactId)))
  return row ? buildContactWithStats(row, userId) : null
}

export async function createContact(
  userId: string,
  body: {
    name: string
    initials?: string
    role?: string
    company?: string
    email?: string
    website?: string
    color?: string
    tags?: string[]
    relationshipLevel?: number
    metVia?: string
    phone?: string
    notes?: TiptapDoc | null
    imageUrl?: string | null
    stage?: string | null
    dealValue?: string | null
    dealStatus?: string | null
    entityType?: string
    nameTh?: string | null
    addressTh?: string | null
    taxId?: string | null
    branchNumber?: string | null
    zip?: string | null
    country?: string | null
    address?: string | null
    nationalId?: string | null
    companyNameEn?: string | null
    companyNameTh?: string | null
    companyAddress?: string | null
    companyAddressTh?: string | null
    companyZip?: string | null
    companyCountry?: string | null
  },
) {
  const [row] = await db.insert(contacts).values({
    userId,
    name: body.name,
    initials: body.initials ?? '',
    role: body.role ?? '',
    company: body.company ?? '',
    email: body.email ?? '',
    website: body.website ?? '',
    color: body.color ?? '#D4A843',
    tags: JSON.stringify(body.tags ?? []),
    relationshipLevel: body.relationshipLevel ?? 1,
    metVia: body.metVia ?? 'Direct',
    phone: body.phone ?? null,
    notes: normalizeTiptapDoc(body.notes),
    imageUrl: body.imageUrl ?? null,
    stage: body.stage ?? 'lead',
    dealValue: body.dealValue ?? null,
    dealStatus: body.dealStatus ?? 'none',
    entityType: body.entityType ?? 'individual',
    nameTh: body.nameTh ?? null,
    addressTh: body.addressTh ?? null,
    taxId: body.taxId ?? null,
    branchNumber: body.branchNumber ?? null,
    zip: body.zip ?? null,
    country: body.country ?? null,
    address: body.address ?? null,
    nationalId: body.nationalId ?? null,
    companyNameEn: body.companyNameEn ?? null,
    companyNameTh: body.companyNameTh ?? null,
    companyAddress: body.companyAddress ?? null,
    companyAddressTh: body.companyAddressTh ?? null,
    companyZip: body.companyZip ?? null,
    companyCountry: body.companyCountry ?? null,
  }).returning()
  logContactCreated(row, userId)

  await createNotification({
    userId,
    title: 'New contact added',
    body: `${row.name} was added to your contacts.`,
    key: 'contactAdded',
    params: { name: row.name },
    link: `/contacts/${row.id}`,
    event: 'contactAdded',
  })

  return buildContactWithStats(row, userId)
}

export async function patchContact(
  userId: string,
  contactId: string,
  body: Partial<{
    name: string
    initials: string
    role: string
    company: string
    email: string
    website: string
    color: string
    tags: string[]
    relationshipLevel: number
    metVia: string
    phone: string
    notes: TiptapDoc | null
    imageUrl: string | null
    stage: string | null
    dealValue: string | null
    dealStatus: string | null
    entityType: string
    nameTh: string | null
    addressTh: string | null
    taxId: string | null
    branchNumber: string | null
    zip: string | null
    country: string | null
    address: string | null
    nationalId: string | null
    companyNameEn: string | null
    companyNameTh: string | null
    companyAddress: string | null
    companyAddressTh: string | null
    companyZip: string | null
    companyCountry: string | null
  }>,
  options?: { skipActivityLog?: boolean },
) {
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))

  if (!existing) return null

  const patch: Partial<typeof contacts.$inferInsert> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.initials !== undefined) patch.initials = body.initials
  if (body.role !== undefined) patch.role = body.role
  if (body.company !== undefined) patch.company = body.company
  if (body.email !== undefined) patch.email = body.email
  if (body.website !== undefined) patch.website = body.website
  if (body.color !== undefined) patch.color = body.color
  if (body.tags !== undefined) patch.tags = JSON.stringify(body.tags)
  if (body.relationshipLevel !== undefined) patch.relationshipLevel = body.relationshipLevel
  if (body.metVia !== undefined) patch.metVia = body.metVia
  if (body.phone !== undefined) patch.phone = body.phone
  if (body.notes !== undefined) patch.notes = normalizeTiptapDoc(body.notes)
  if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl
  if (body.stage !== undefined) patch.stage = body.stage
  if (body.dealValue !== undefined) patch.dealValue = body.dealValue
  if (body.dealStatus !== undefined) patch.dealStatus = body.dealStatus
  if (body.entityType !== undefined) patch.entityType = body.entityType
  if (body.nameTh !== undefined) patch.nameTh = body.nameTh
  if (body.addressTh !== undefined) patch.addressTh = body.addressTh
  if (body.taxId !== undefined) patch.taxId = body.taxId
  if (body.branchNumber !== undefined) patch.branchNumber = body.branchNumber
  if (body.zip !== undefined) patch.zip = body.zip
  if (body.country !== undefined) patch.country = body.country
  if (body.address !== undefined) patch.address = body.address
  if (body.nationalId !== undefined) patch.nationalId = body.nationalId
  if (body.companyNameEn !== undefined) patch.companyNameEn = body.companyNameEn
  if (body.companyNameTh !== undefined) patch.companyNameTh = body.companyNameTh
  if (body.companyAddress !== undefined) patch.companyAddress = body.companyAddress
  if (body.companyAddressTh !== undefined) patch.companyAddressTh = body.companyAddressTh
  if (body.companyZip !== undefined) patch.companyZip = body.companyZip
  if (body.companyCountry !== undefined) patch.companyCountry = body.companyCountry
  patch.updatedAt = new Date()

  const [updated] = await db
    .update(contacts)
    .set(patch)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .returning()

  if (!updated) return null

  if (!options?.skipActivityLog) {
    const activity = buildContactPatchActivity(body, updated.name)
    if (activity) {
      logContactUpdated({ id: contactId, name: updated.name }, userId, Object.keys(body), activity.metadata)
    }
  }

  return buildContactWithStats(updated, userId)
}

export async function deleteContact(userId: string, contactId: string): Promise<boolean> {
  const result = await db.delete(contacts).where(
    and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
  ).returning({ id: contacts.id })
  if (result.length === 0) return false
  logContactDeleted({ id: contactId }, userId)
  return true
}

export async function bulkDeleteContacts(userId: string, ids: string[]) {
  if (ids.length === 0) return 0
  const result = await db
    .delete(contacts)
    .where(and(inArray(contacts.id, ids), eq(contacts.userId, userId)))
    .returning({ id: contacts.id })
  return result.length
}

export async function importContacts(
  userId: string,
  rows: Array<{ name?: string; email?: string; phone?: string; company?: string; notes?: string }>,
) {
  let imported = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.name?.trim()) {
      skipped++
      continue
    }
    const name = row.name.trim()
    await db.insert(contacts).values({
      userId,
      name,
      initials: name.split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0].toUpperCase()).join(''),
      company: row.company?.trim() ?? '',
      email: row.email?.trim() ?? '',
      phone: row.phone?.trim() ?? null,
      notes: textToTiptapDoc(row.notes ?? ''),
      color: '#D4A843',
      tags: '[]',
      relationshipLevel: 1,
      metVia: 'Import',
      role: '',
      website: '',
      imageUrl: null,
      stage: 'lead',
      dealValue: null,
      dealStatus: 'none',
    })
    imported++
  }

  return { imported, skipped }
}

export async function mergeContactsService(
  userId: string,
  primaryId: string,
  secondaryId: string,
) {
  const [primary, secondary] = await Promise.all([
    getContact(userId, primaryId),
    getContact(userId, secondaryId),
  ])

  if (!primary) return { merged: false, message: 'Primary contact not found' }
  if (!secondary) return { merged: false, message: 'Secondary contact not found' }

  const mergedTags = Array.from(new Set([...primary.tags, ...secondary.tags]))

  await db.transaction(async (tx) => {
    await tx
      .update(contacts)
      .set({ tags: JSON.stringify(mergedTags), updatedAt: new Date() })
      .where(and(eq(contacts.id, primaryId), eq(contacts.userId, userId)))

    await tx
      .update(projects)
      .set({ contactId: primaryId, updatedAt: new Date() })
      .where(and(eq(projects.userId, userId), eq(projects.contactId, secondaryId)))

    await tx
      .update(documents)
      .set({ contactId: primaryId, updatedAt: new Date() })
      .where(and(eq(documents.userId, userId), eq(documents.contactId, secondaryId)))

    await tx
      .update(activityLogs)
      .set({ contactId: primaryId })
      .where(and(eq(activityLogs.userId, userId), eq(activityLogs.contactId, secondaryId)))

    await tx
      .delete(contacts)
      .where(and(eq(contacts.id, secondaryId), eq(contacts.userId, userId)))
  })

  logContactMerged({ id: primaryId, name: primary.name }, userId, secondaryId, secondary.name)

  return { merged: true, survivingContactId: primaryId, deletedContactId: secondaryId }
}

async function computeContactBriefing(userId: string, contactId: string) {
  const contact = await getContact(userId, contactId)
  if (!contact) return null

  const [linkedProjects, recentActivity, openDocs] = await Promise.all([
    db.select().from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.contactId, contactId), isNull(projects.deletedAt))),
    db.select().from(activityLogs)
      .where(and(eq(activityLogs.userId, userId), eq(activityLogs.contactId, contactId)))
      .orderBy(desc(activityLogs.createdAt)).limit(5),
    db.select({ id: documents.id, type: documents.type, status: documents.status, totalCents: documents.totalCents, dueDate: documents.dueDate })
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.contactId, contactId), isNull(documents.deletedAt))),
  ])

  const totalRevenueCents = await getContactTotalBilledCents(userId, contactId)

  const openInvoices = openDocs.filter((d) => isOpenInvoice(d))
  const daysSince = contact.lastContactedAt
    ? Math.floor((Date.now() - new Date(contact.lastContactedAt).getTime()) / 86_400_000)
    : null

  let recommendedAction = 'Relationship in good standing'
  if (daysSince !== null && daysSince > 60) recommendedAction = 'Schedule a check-in — no contact in ' + daysSince + ' days'
  else if (openInvoices.length > 0) recommendedAction = 'Follow up on ' + openInvoices.length + ' open invoice(s)'
  else if (linkedProjects.length === 0) recommendedAction = 'Discuss a new project or opportunity'

  return {
    contact,
    projects: linkedProjects.map((p) => ({ id: p.id, name: p.name, archived: p.archived })),
    recentActivity: recentActivity.map((a) => ({
      action: a.action,
      summaryKey: a.summaryKey,
      summaryParams: a.summaryParams,
      createdAt: instantFieldToWire(a.createdAt)!,
    })),
    totalRevenueCents,
    openInvoiceCount: openInvoices.length,
    daysSinceLastContact: daysSince,
    recommendedAction,
  }
}

/**
 * The briefing is plain DB aggregation, so it is recomputed per request instead
 * of served from `briefingData`: cached snapshots kept drifting from the contact
 * response schema and failed response validation with a 422 on every GET.
 */
export async function getContactBriefing(userId: string, contactId: string) {
  const briefing = await computeContactBriefing(userId, contactId)
  if (!briefing) return null

  const [row] = await db
    .select({ briefingCheckedAt: contacts.briefingCheckedAt })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))

  return {
    cached: row?.briefingCheckedAt != null,
    checkedAt: instantFieldToWire(row?.briefingCheckedAt ?? null),
    briefing,
  }
}

export async function regenerateContactBriefing(userId: string, contactId: string) {
  const briefing = await computeContactBriefing(userId, contactId)
  if (!briefing) return null

  const checkedAt = new Date()
  await db
    .update(contacts)
    .set({ briefingCheckedAt: checkedAt })
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))

  return { cached: true, checkedAt: instantToIso(checkedAt), briefing }
}

export async function getOutreachQueue(userId: string, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, userId),
        or(
          lt(contacts.lastContactedAt, cutoff),
          isNull(contacts.lastContactedAt),
        ),
      ),
    )
    .orderBy(contacts.relationshipLevel, asc(contacts.lastContactedAt))
    .limit(20)

  return rows
    .filter((r) => r.stage !== 'churned')
    .map((row) => ({
      ...buildContact(row),
      daysSinceContact: row.lastContactedAt
        ? Math.floor((Date.now() - new Date(row.lastContactedAt).getTime()) / 86_400_000)
        : null,
    }))
}
