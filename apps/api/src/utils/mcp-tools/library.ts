import { eq, and, asc, max } from 'drizzle-orm'
import { itemTemplates, itemTemplateGroups, itemTemplateGroupMembers, remarkTemplates, senderProfiles } from '@mana/db'
import { db } from '@api/db'
import { deleteTemplateImage } from '@api/modules/item-templates/image'
import { itemTemplateGroupToWire } from '@api/modules/item-templates/wire'
import { listOwnedItemTemplateGroupMembers, requireOwnedItemTemplateIds } from '@api/modules/item-template-groups/service'
import {
  listSenderProfiles,
  patchSenderProfile,
  setDefaultSenderProfile,
  listRemarkTemplates,
  createRemarkTemplate,
  patchRemarkTemplate,
  deleteRemarkTemplate,
  setDefaultRemarkTemplate,
} from '@api/modules/business/service'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

const EXTERNAL_LIST_DEFAULT_LIMIT = 50
const EXTERNAL_LIST_MAX_LIMIT = 100
const EXTERNAL_GROUP_MEMBER_LIMIT = 10
const externalLimitSchema = {
  type: 'integer' as const,
  minimum: 1,
  maximum: EXTERNAL_LIST_MAX_LIMIT,
  default: EXTERNAL_LIST_DEFAULT_LIMIT,
  description: 'External MCP response limit. Default 50, maximum 100; the in-app assistant keeps its full context.',
}

type McpSenderProfile = Pick<typeof senderProfiles.$inferSelect,
  | 'id'
  | 'name'
  | 'isDefault'
  | 'entityType'
  | 'defaultDueDaysOffset'
  | 'defaultDueDaysQo'
  | 'defaultDueDaysRc'
  | 'defaultTaxRateBps'
  | 'vatRegistered'
  | 'documentLanguage'
>

function toMcpSenderProfile(profile: McpSenderProfile) {
  return {
    id: profile.id,
    name: profile.name,
    isDefault: profile.isDefault,
    entityType: profile.entityType,
    defaultDueDaysOffset: profile.defaultDueDaysOffset,
    defaultDueDaysQo: profile.defaultDueDaysQo,
    defaultDueDaysRc: profile.defaultDueDaysRc,
    defaultTaxRateBps: profile.defaultTaxRateBps,
    vatRegistered: profile.vatRegistered,
    documentLanguage: profile.documentLanguage,
  }
}

function toMcpRemarkTemplate(template: typeof remarkTemplates.$inferSelect) {
  return {
    id: template.id,
    name: template.name,
    body: template.body,
    defaultFor: template.defaultFor,
    position: template.position,
  }
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

function toTemplateSummary(row: typeof itemTemplates.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    defaultQty: row.defaultQty,
    defaultUnitPriceCents: row.defaultUnitPriceCents,
    currency: row.currency,
    position: row.position,
  }
}

async function getItemTemplates(userId: string) {
  const rows = await db.select().from(itemTemplates)
    .where(eq(itemTemplates.userId, userId))
    .orderBy(asc(itemTemplates.position), asc(itemTemplates.createdAt))
  return rows.map(toTemplateSummary)
}

async function getItemTemplatesBounded(userId: string, limit: number) {
  const rows = await db.select().from(itemTemplates)
    .where(eq(itemTemplates.userId, userId))
    .orderBy(asc(itemTemplates.position), asc(itemTemplates.createdAt))
    .limit(limit + 1)
  return {
    items: rows.slice(0, limit).map(toTemplateSummary),
    limit,
    hasMore: rows.length > limit,
  }
}

/** These tools write straight to the table, so the request-body bounds never run. */
function assertWholeQty(value: unknown) {
  if (typeof value === 'number' && !(Number.isInteger(value) && value >= 100 && value % 100 === 0)) {
    throw new Error('defaultQty must be whole units in hundredths (100 = 1 unit)')
  }
}

async function createItemTemplate(userId: string, args: Record<string, unknown>) {
  assertWholeQty(args.defaultQty)
  const [maxRow] = await db.select({ maxPos: max(itemTemplates.position) })
    .from(itemTemplates).where(eq(itemTemplates.userId, userId))
  const [created] = await db.insert(itemTemplates).values({
    userId,
    name: args.name as string,
    description: typeof args.description === 'string' ? args.description : '',
    defaultQty: typeof args.defaultQty === 'number' ? args.defaultQty : 100,
    defaultUnitPriceCents: typeof args.defaultUnitPriceCents === 'number' ? args.defaultUnitPriceCents : 0,
    currency: typeof args.currency === 'string' ? args.currency : 'THB',
    position: (maxRow?.maxPos ?? -1) + 1,
  }).returning()
  return toTemplateSummary(created)
}

async function updateItemTemplate(userId: string, id: string, args: Record<string, unknown>) {
  assertWholeQty(args.defaultQty)
  const patch: Partial<typeof itemTemplates.$inferInsert> = {}
  if (typeof args.name === 'string') patch.name = args.name
  if (typeof args.description === 'string') patch.description = args.description
  if (typeof args.defaultQty === 'number') patch.defaultQty = args.defaultQty
  if (typeof args.defaultUnitPriceCents === 'number') patch.defaultUnitPriceCents = args.defaultUnitPriceCents
  if (typeof args.currency === 'string') patch.currency = args.currency

  const [updated] = await db.update(itemTemplates)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(itemTemplates.id, id), eq(itemTemplates.userId, userId)))
    .returning()
  if (!updated) return { message: 'Template not found' }
  return toTemplateSummary(updated)
}

async function deleteItemTemplate(userId: string, id: string) {
  const [current] = await db.select().from(itemTemplates)
    .where(and(eq(itemTemplates.id, id), eq(itemTemplates.userId, userId)))
  if (!current) return { message: 'Template not found' }
  await deleteTemplateImage(current.imageR2Key)
  await db.delete(itemTemplates)
    .where(and(eq(itemTemplates.id, id), eq(itemTemplates.userId, userId)))
  return { deleted: true, id }
}

async function getItemTemplateGroups(userId: string) {
  const groups = await db.select().from(itemTemplateGroups)
    .where(eq(itemTemplateGroups.userId, userId))
    .orderBy(asc(itemTemplateGroups.position), asc(itemTemplateGroups.createdAt))
  if (groups.length === 0) return []

  const members = await listOwnedItemTemplateGroupMembers(userId, groups.map((group) => group.id))

  return groups.map((group) =>
    itemTemplateGroupToWire(group, {
      templates: members
        .filter((m) => m.groupId === group.id)
        .map(({ groupId: _groupId, ...template }) => template),
    }),
  )
}

function toExternalItemTemplateGroup(
  group: typeof itemTemplateGroups.$inferSelect,
  templates: Awaited<ReturnType<typeof listOwnedItemTemplateGroupMembers>>,
) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    color: group.color,
    position: group.position,
    templates: templates.slice(0, EXTERNAL_GROUP_MEMBER_LIMIT).map(({ groupId: _groupId, ...template }) => template),
    templatesLimit: EXTERNAL_GROUP_MEMBER_LIMIT,
    templatesHasMore: templates.length > EXTERNAL_GROUP_MEMBER_LIMIT,
  }
}

async function getItemTemplateGroupsBounded(userId: string, limit: number) {
  const rows = await db.select().from(itemTemplateGroups)
    .where(eq(itemTemplateGroups.userId, userId))
    .orderBy(asc(itemTemplateGroups.position), asc(itemTemplateGroups.createdAt))
    .limit(limit + 1)
  const groups = rows.slice(0, limit)
  const items = await Promise.all(groups.map(async (group) => {
    const templates = await listOwnedItemTemplateGroupMembers(
      userId,
      [group.id],
      EXTERNAL_GROUP_MEMBER_LIMIT + 1,
    )
    return toExternalItemTemplateGroup(group, templates)
  }))

  return {
    items,
    limit,
    hasMore: rows.length > limit,
  }
}

async function createItemTemplateGroup(userId: string, args: Record<string, unknown>) {
  const requestedTemplateIds = Array.isArray(args.templateIds)
    ? args.templateIds.filter((templateId): templateId is string => typeof templateId === 'string')
    : []
  const templateIds = await requireOwnedItemTemplateIds(userId, requestedTemplateIds)
  const [maxRow] = await db.select({ maxPos: max(itemTemplateGroups.position) })
    .from(itemTemplateGroups).where(eq(itemTemplateGroups.userId, userId))
  const [created] = await db.insert(itemTemplateGroups).values({
    userId,
    name: args.name as string,
    description: typeof args.description === 'string' ? args.description : '',
    color: typeof args.color === 'string' ? args.color : 'amber',
    position: (maxRow?.maxPos ?? -1) + 1,
  }).returning()

  if (templateIds.length > 0) {
    await db.insert(itemTemplateGroupMembers).values(
      templateIds.map((templateId, i) => ({ groupId: created.id, templateId, position: i })),
    )
  }
  return itemTemplateGroupToWire(created, { templates: [] })
}

async function addTemplatesToGroup(userId: string, groupId: string, templateIds: string[]) {
  const [group] = await db.select({ id: itemTemplateGroups.id }).from(itemTemplateGroups)
    .where(and(eq(itemTemplateGroups.id, groupId), eq(itemTemplateGroups.userId, userId)))
  if (!group) return { message: 'Group not found' }

  const ownedTemplateIds = await requireOwnedItemTemplateIds(userId, templateIds)
  if (ownedTemplateIds.length === 0) return { added: true, groupId, templateIds: [] }

  const [maxRow] = await db.select({ maxPos: max(itemTemplateGroupMembers.position) })
    .from(itemTemplateGroupMembers).where(eq(itemTemplateGroupMembers.groupId, groupId))
  const startPos = (maxRow?.maxPos ?? -1) + 1

  await db.insert(itemTemplateGroupMembers)
    .values(ownedTemplateIds.map((templateId, i) => ({ groupId, templateId, position: startPos + i })))
    .onConflictDoNothing()
  return { added: true, groupId, templateIds: ownedTemplateIds }
}

async function getExternalSenderProfiles(userId: string, limit: number) {
  const rows = await db
    .select({
      id: senderProfiles.id,
      name: senderProfiles.name,
      isDefault: senderProfiles.isDefault,
      entityType: senderProfiles.entityType,
      defaultDueDaysOffset: senderProfiles.defaultDueDaysOffset,
      defaultDueDaysQo: senderProfiles.defaultDueDaysQo,
      defaultDueDaysRc: senderProfiles.defaultDueDaysRc,
      defaultTaxRateBps: senderProfiles.defaultTaxRateBps,
      vatRegistered: senderProfiles.vatRegistered,
      documentLanguage: senderProfiles.documentLanguage,
    })
    .from(senderProfiles)
    .where(eq(senderProfiles.userId, userId))
    .orderBy(asc(senderProfiles.createdAt), asc(senderProfiles.id))
    .limit(limit + 1)

  return {
    items: rows.slice(0, limit).map(toMcpSenderProfile),
    limit,
    hasMore: rows.length > limit,
  }
}

async function getRemarkTemplatesBounded(userId: string, limit: number) {
  const rows = await db.select().from(remarkTemplates)
    .where(eq(remarkTemplates.userId, userId))
    .orderBy(asc(remarkTemplates.position), asc(remarkTemplates.createdAt))
    .limit(limit + 1)
  return {
    items: rows.slice(0, limit).map(toMcpRemarkTemplate),
    limit,
    hasMore: rows.length > limit,
  }
}

async function removeTemplateFromGroup(userId: string, groupId: string, templateId: string) {
  const [group] = await db.select({ id: itemTemplateGroups.id }).from(itemTemplateGroups)
    .where(and(eq(itemTemplateGroups.id, groupId), eq(itemTemplateGroups.userId, userId)))
  if (!group) return { message: 'Group not found' }

  await db.delete(itemTemplateGroupMembers)
    .where(and(eq(itemTemplateGroupMembers.groupId, groupId), eq(itemTemplateGroupMembers.templateId, templateId)))
  return { removed: true, groupId, templateId }
}

async function deleteItemTemplateGroup(userId: string, id: string) {
  const [deleted] = await db.delete(itemTemplateGroups)
    .where(and(eq(itemTemplateGroups.id, id), eq(itemTemplateGroups.userId, userId)))
    .returning({ id: itemTemplateGroups.id })
  if (!deleted) return { message: 'Group not found' }
  return { deleted: true, id }
}

const templateFieldProperties = {
  name: { type: 'string' },
  description: { type: 'string' },
  defaultQty: { type: 'integer', multipleOf: 100, description: 'Default quantity in hundredths of a unit; whole units only (100 = 1, 200 = 2)' },
  defaultUnitPriceCents: { type: 'number', description: 'Unit price in cents (e.g. 500000 = 5,000.00)' },
  currency: { type: 'string', description: 'Currency code, defaults to THB' },
} as const

export const libraryTools = [
  {
    name: 'get_item_templates',
    description: 'List reusable line-item templates from the document library. External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: { type: 'object' as const, properties: { limit: externalLimitSchema }, required: [] },
  },
  {
    name: 'create_item_template',
    description: 'Create a reusable line-item template in the document library',
    input_schema: {
      type: 'object' as const,
      properties: templateFieldProperties,
      required: ['name'],
    },
  },
  {
    name: 'update_item_template',
    description: 'Update a line-item template (name, description, default qty, unit price, currency)',
    input_schema: {
      type: 'object' as const,
      properties: { id: { type: 'string' }, ...templateFieldProperties },
      required: ['id'],
    },
  },
  {
    name: 'delete_item_template',
    description: 'Permanently delete a line-item template from the library',
    input_schema: {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'get_item_template_groups',
    description: 'List template packages with their member templates. External MCP returns bounded groups and up to ten member templates per group.',
    input_schema: { type: 'object' as const, properties: { limit: externalLimitSchema }, required: [] },
  },
  {
    name: 'create_item_template_group',
    description: 'Create a template package (group), optionally with initial template IDs as members',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string', description: 'Accent color name, defaults to amber' },
        templateIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['name'],
    },
  },
  {
    name: 'add_templates_to_group',
    description: 'Add line-item templates to an existing package (group)',
    input_schema: {
      type: 'object' as const,
      properties: {
        groupId: { type: 'string' },
        templateIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['groupId', 'templateIds'],
    },
  },
  {
    name: 'remove_template_from_group',
    description: 'Remove a line-item template from a package (group) — the template itself is kept',
    input_schema: {
      type: 'object' as const,
      properties: {
        groupId: { type: 'string' },
        templateId: { type: 'string' },
      },
      required: ['groupId', 'templateId'],
    },
  },
  {
    name: 'delete_item_template_group',
    description: 'Delete a template package (group) — member templates are kept',
    input_schema: {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'get_sender_profiles',
    description: 'List the document-ready sender profile choices. External MCP returns a bounded, minimal profile projection without contact, tax-ID, image, or e-tax details.',
    input_schema: { type: 'object' as const, properties: { limit: externalLimitSchema }, required: [] },
  },
  {
    name: 'update_sender_profile',
    description: 'Update a business identity (sender) profile — name, registered name/address (TH+EN), email, phone, tax ID, VAT registration, default due days and tax/WHT rates (basis points), document language',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        registeredName: { type: 'string' },
        registeredNameEn: { type: 'string' },
        yourEmail: { type: 'string' },
        yourPhone: { type: 'string' },
        registeredAddress: { type: 'string' },
        registeredAddressEn: { type: 'string' },
        yourCountry: { type: 'string' },
        yourZip: { type: 'string' },
        yourTaxId: { type: 'string' },
        yourBranchNumber: { type: 'string' },
        vatRegistered: { type: 'boolean' },
        documentLanguage: { type: 'string', description: '"th" or "en"' },
        defaultDueDaysOffset: { type: 'number', description: 'Invoice due-date offset in days' },
        defaultDueDaysQo: { type: 'number', description: 'Quotation validity in days' },
        defaultDueDaysRc: { type: 'number', description: 'Receipt due-date offset in days' },
        defaultTaxRateBps: { type: 'number', description: 'Tax rate in basis points (700 = 7%)' },
        defaultRemark: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'set_default_sender_profile',
    description: 'Set a sender profile as the default business identity for new documents',
    input_schema: {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'get_remark_templates',
    description: 'List remark templates (reusable notes/payment terms shown at the bottom of documents). External MCP returns a bounded { items, limit, hasMore } result.',
    input_schema: { type: 'object' as const, properties: { limit: externalLimitSchema }, required: [] },
  },
  {
    name: 'create_remark_template',
    description: 'Create a remark template (reusable document footer note, e.g. payment terms)',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_remark_template',
    description: 'Update a remark template name or body',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_remark_template',
    description: 'Delete a remark template',
    input_schema: {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'set_default_remark_template',
    description: 'Set a remark template as the default for a document type',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        documentType: { type: 'string', enum: ['QO', 'INV', 'RC'] },
      },
      required: ['id', 'documentType'],
    },
  },
] as const

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
const num = (v: unknown) => (typeof v === 'number' ? v : undefined)
const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined)

function requireString(args: Record<string, unknown>, key: string, tool: string): string {
  const value = args[key]
  if (typeof value !== 'string') throw new Error(`${tool} requires ${key}`)
  return value
}

function requireStringArray(args: Record<string, unknown>, key: string, tool: string): string[] {
  const value = args[key]
  if (!Array.isArray(value) || !value.every((v): v is string => typeof v === 'string')) {
    throw new Error(`${tool} requires ${key} as an array of strings`)
  }
  return value
}

export const libraryHandlers: Record<string, McpToolHandler> = {
  'get_item_templates': (userId, args, context) => {
    const limit = externalListLimit(args, context)
    return limit === null ? getItemTemplates(userId) : getItemTemplatesBounded(userId, limit)
  },
  'create_item_template': (userId, args) => {
    requireString(args, 'name', 'create_item_template')
    return createItemTemplate(userId, args)
  },
  'update_item_template': (userId, args) =>
    updateItemTemplate(userId, requireString(args, 'id', 'update_item_template'), args),
  'delete_item_template': (userId, args) =>
    deleteItemTemplate(userId, requireString(args, 'id', 'delete_item_template')),
  'get_item_template_groups': (userId, args, context) => {
    const limit = externalListLimit(args, context)
    return limit === null ? getItemTemplateGroups(userId) : getItemTemplateGroupsBounded(userId, limit)
  },
  'create_item_template_group': (userId, args) => {
    requireString(args, 'name', 'create_item_template_group')
    return createItemTemplateGroup(userId, args)
  },
  'add_templates_to_group': (userId, args) =>
    addTemplatesToGroup(
      userId,
      requireString(args, 'groupId', 'add_templates_to_group'),
      requireStringArray(args, 'templateIds', 'add_templates_to_group'),
    ),
  'remove_template_from_group': (userId, args) =>
    removeTemplateFromGroup(
      userId,
      requireString(args, 'groupId', 'remove_template_from_group'),
      requireString(args, 'templateId', 'remove_template_from_group'),
    ),
  'delete_item_template_group': (userId, args) =>
    deleteItemTemplateGroup(userId, requireString(args, 'id', 'delete_item_template_group')),
  'get_sender_profiles': async (userId, args, context) => {
    const limit = externalListLimit(args, context)
    return limit === null ? listSenderProfiles(userId) : getExternalSenderProfiles(userId, limit)
  },
  'update_sender_profile': async (userId, args, context) => {
    const id = requireString(args, 'id', 'update_sender_profile')
    const row = await patchSenderProfile(userId, id, {
      name: str(args.name),
      registeredName: str(args.registeredName),
      registeredNameEn: str(args.registeredNameEn),
      yourEmail: str(args.yourEmail),
      yourPhone: str(args.yourPhone),
      registeredAddress: str(args.registeredAddress),
      registeredAddressEn: str(args.registeredAddressEn),
      yourCountry: str(args.yourCountry),
      yourZip: str(args.yourZip),
      yourTaxId: str(args.yourTaxId),
      yourBranchNumber: str(args.yourBranchNumber),
      vatRegistered: bool(args.vatRegistered),
      documentLanguage: str(args.documentLanguage),
      defaultDueDaysOffset: num(args.defaultDueDaysOffset),
      defaultDueDaysQo: num(args.defaultDueDaysQo),
      defaultDueDaysRc: num(args.defaultDueDaysRc),
      defaultTaxRateBps: num(args.defaultTaxRateBps),
      defaultRemark: str(args.defaultRemark),
    })
    if (!row) return { message: 'Sender profile not found' }
    return context?.source === 'external-mcp' ? toMcpSenderProfile(row) : row
  },
  'set_default_sender_profile': async (userId, args) => {
    const id = requireString(args, 'id', 'set_default_sender_profile')
    const found = await setDefaultSenderProfile(userId, id)
    return found ? { default: true, id } : { message: 'Sender profile not found' }
  },
  'get_remark_templates': (userId, args, context) => {
    const limit = externalListLimit(args, context)
    return limit === null ? listRemarkTemplates(userId) : getRemarkTemplatesBounded(userId, limit)
  },
  'create_remark_template': (userId, args) =>
    createRemarkTemplate(userId, {
      name: requireString(args, 'name', 'create_remark_template'),
      body: typeof args.body === 'string' ? args.body : undefined,
    }),
  'update_remark_template': async (userId, args) => {
    const id = requireString(args, 'id', 'update_remark_template')
    const row = await patchRemarkTemplate(userId, id, {
      name: typeof args.name === 'string' ? args.name : undefined,
      body: typeof args.body === 'string' ? args.body : undefined,
    })
    return row ?? { message: 'Remark template not found' }
  },
  'delete_remark_template': async (userId, args) => {
    const id = requireString(args, 'id', 'delete_remark_template')
    const deleted = await deleteRemarkTemplate(userId, id)
    return deleted ? { deleted: true, id } : { message: 'Remark template not found' }
  },
  'set_default_remark_template': async (userId, args) => {
    const id = requireString(args, 'id', 'set_default_remark_template')
    const documentType = requireString(args, 'documentType', 'set_default_remark_template')
    if (documentType !== 'QO' && documentType !== 'INV' && documentType !== 'RC') {
      throw new Error('set_default_remark_template requires documentType to be QO, INV, or RC')
    }
    const found = await setDefaultRemarkTemplate(userId, id, documentType)
    return found ? { default: true, id, documentType } : { message: 'Remark template not found' }
  },
}
