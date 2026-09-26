import { db } from '@api/db'
import { senderProfiles, remarkTemplates, DEFAULT_REMARK_TEMPLATE_SEEDS } from '@mana/db'
import { eq, and, asc } from 'drizzle-orm'
import { remarkTemplateToWire, senderProfileToWire } from '@api/modules/business/wire'
import { ValidationError } from '@api/lib/errors'
import { uploadDocumentImage, deleteDocumentImage } from '@api/modules/documents/images'

export async function seedDefaultRemarkTemplates(userId: string) {
  const [existing] = await db
    .select({ id: remarkTemplates.id })
    .from(remarkTemplates)
    .where(eq(remarkTemplates.userId, userId))
    .limit(1)
  if (existing) return

  await db.insert(remarkTemplates).values(
    DEFAULT_REMARK_TEMPLATE_SEEDS.map((seed, position) => ({
      userId,
      name: seed.name,
      body: seed.body,
      defaultFor: seed.defaultFor,
      position,
    })),
  )
}

type SenderProfileInsert = {
  name: string
  isDefault?: boolean
  entityType?: string
  defaultDueDaysOffset?: number
  defaultDueDaysQo?: number | null
  defaultDueDaysRc?: number | null
  defaultTaxRateBps?: number
  registeredName?: string
  registeredNameEn?: string
  yourEmail?: string
  yourPhone?: string
  yourAddress?: string
  yourAddressEn?: string
  yourAddressZip?: string
  yourAddressCountry?: string
  useSameAddressForCompany?: boolean
  registeredAddress?: string
  registeredAddressEn?: string
  yourCountry?: string
  yourZip?: string
  yourTaxId?: string
  yourBranchNumber?: string
  yourLogo?: string
  signatureImage?: string
  signaturePlacement?: string
  vatRegistered?: boolean
  documentLanguage?: string
  defaultRemark?: string
}

/**
 * A negative due-days offset would generate documents whose due date precedes
 * their issue date, so guard here rather than in the route body — the MCP tools
 * call this service directly and skip route validation.
 */
function assertSenderProfileDefaults(body: Partial<SenderProfileInsert>) {
  for (const key of ['defaultDueDaysOffset', 'defaultDueDaysQo', 'defaultDueDaysRc'] as const) {
    const days = body[key]
    if (days !== undefined && days !== null && !(Number.isInteger(days) && days >= 0)) {
      throw new ValidationError(`${key} must be a whole number of days, zero or more`)
    }
  }
  const bps = body.defaultTaxRateBps
  if (bps !== undefined && !(Number.isInteger(bps) && bps >= 0 && bps <= 10_000)) {
    throw new ValidationError('defaultTaxRateBps must be between 0 and 10000 (0%–100%)')
  }
}

export async function setDefaultSenderProfile(userId: string, id: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx
      .update(senderProfiles)
      .set({ isDefault: false })
      .where(and(eq(senderProfiles.userId, userId), eq(senderProfiles.isDefault, true)))
    const [updated] = await tx
      .update(senderProfiles)
      .set({ isDefault: true })
      .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
      .returning()
    return !!updated
  })
}

export async function listSenderProfiles(userId: string) {
  const rows = await db
    .select()
    .from(senderProfiles)
    .where(eq(senderProfiles.userId, userId))
    .orderBy(asc(senderProfiles.createdAt), asc(senderProfiles.id))
  return Promise.all(rows.map(senderProfileToWire))
}

export async function createSenderProfile(userId: string, body: SenderProfileInsert) {
  assertSenderProfileDefaults(body)
  const [row] = await db
    .insert(senderProfiles)
    .values({
      userId,
      name: body.name,
      isDefault: body.isDefault ?? false,
      entityType: body.entityType ?? 'individual',
      defaultDueDaysOffset: body.defaultDueDaysOffset ?? 30,
      defaultDueDaysQo: body.defaultDueDaysQo ?? null,
      defaultDueDaysRc: body.defaultDueDaysRc ?? null,
      defaultTaxRateBps: body.defaultTaxRateBps ?? 700,
      registeredName: body.registeredName,
      registeredNameEn: body.registeredNameEn,
      yourEmail: body.yourEmail,
      yourPhone: body.yourPhone,
      yourAddress: body.yourAddress,
      yourAddressEn: body.yourAddressEn,
      yourAddressZip: body.yourAddressZip,
      yourAddressCountry: body.yourAddressCountry,
      useSameAddressForCompany: body.useSameAddressForCompany ?? true,
      registeredAddress: body.registeredAddress,
      registeredAddressEn: body.registeredAddressEn,
      yourCountry: body.yourCountry,
      yourZip: body.yourZip,
      yourTaxId: body.yourTaxId,
      yourBranchNumber: body.yourBranchNumber,
      yourLogo: body.yourLogo,
      signatureImage: body.signatureImage,
      signaturePlacement: body.signaturePlacement,
      vatRegistered: body.vatRegistered ?? false,
      documentLanguage: body.documentLanguage ?? 'th',
      defaultRemark: body.defaultRemark,
    })
    .returning()
  return senderProfileToWire(row)
}

export async function setSenderProfileImage(
  userId: string,
  id: string,
  kind: 'logo' | 'signature',
  base64Data: string,
  mediaType: string,
) {
  const [existing] = await db
    .select()
    .from(senderProfiles)
    .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
    .limit(1)
  if (!existing) return null

  const column = kind === 'logo' ? 'yourLogo' : 'signatureImage'
  const key = await uploadDocumentImage('profile', id, kind, base64Data, mediaType, existing[column])

  const [row] = await db
    .update(senderProfiles)
    .set({ [column]: key, updatedAt: new Date() })
    .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
    .returning()
  return row ? senderProfileToWire(row) : null
}

export async function clearSenderProfileImage(
  userId: string,
  id: string,
  kind: 'logo' | 'signature',
) {
  const [existing] = await db
    .select()
    .from(senderProfiles)
    .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
    .limit(1)
  if (!existing) return null

  const column = kind === 'logo' ? 'yourLogo' : 'signatureImage'
  await deleteDocumentImage(existing[column])

  const [row] = await db
    .update(senderProfiles)
    .set({ [column]: null, updatedAt: new Date() })
    .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
    .returning()
  return row ? senderProfileToWire(row) : null
}

export async function patchSenderProfile(
  userId: string,
  id: string,
  body: Partial<SenderProfileInsert>,
) {
  assertSenderProfileDefaults(body)
  const existing = await db
    .select()
    .from(senderProfiles)
    .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
    .limit(1)
  if (!existing[0]) return null

  const [row] = await db
    .update(senderProfiles)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
      ...(body.entityType !== undefined ? { entityType: body.entityType } : {}),
      ...(body.defaultDueDaysOffset !== undefined ? { defaultDueDaysOffset: body.defaultDueDaysOffset } : {}),
      ...(body.defaultDueDaysQo !== undefined ? { defaultDueDaysQo: body.defaultDueDaysQo } : {}),
      ...(body.defaultDueDaysRc !== undefined ? { defaultDueDaysRc: body.defaultDueDaysRc } : {}),
      ...(body.defaultTaxRateBps !== undefined ? { defaultTaxRateBps: body.defaultTaxRateBps } : {}),
      ...(body.registeredName !== undefined ? { registeredName: body.registeredName } : {}),
      ...(body.registeredNameEn !== undefined ? { registeredNameEn: body.registeredNameEn } : {}),
      ...(body.yourEmail !== undefined ? { yourEmail: body.yourEmail } : {}),
      ...(body.yourPhone !== undefined ? { yourPhone: body.yourPhone } : {}),
      ...(body.yourAddress !== undefined ? { yourAddress: body.yourAddress } : {}),
      ...(body.yourAddressEn !== undefined ? { yourAddressEn: body.yourAddressEn } : {}),
      ...(body.yourAddressZip !== undefined ? { yourAddressZip: body.yourAddressZip } : {}),
      ...(body.yourAddressCountry !== undefined ? { yourAddressCountry: body.yourAddressCountry } : {}),
      ...(body.useSameAddressForCompany !== undefined ? { useSameAddressForCompany: body.useSameAddressForCompany } : {}),
      ...(body.registeredAddress !== undefined ? { registeredAddress: body.registeredAddress } : {}),
      ...(body.registeredAddressEn !== undefined ? { registeredAddressEn: body.registeredAddressEn } : {}),
      ...(body.yourCountry !== undefined ? { yourCountry: body.yourCountry } : {}),
      ...(body.yourZip !== undefined ? { yourZip: body.yourZip } : {}),
      ...(body.yourTaxId !== undefined ? { yourTaxId: body.yourTaxId } : {}),
      ...(body.yourBranchNumber !== undefined ? { yourBranchNumber: body.yourBranchNumber } : {}),
      ...(body.yourLogo !== undefined ? { yourLogo: body.yourLogo } : {}),
      ...(body.signatureImage !== undefined ? { signatureImage: body.signatureImage } : {}),
      ...(body.signaturePlacement !== undefined ? { signaturePlacement: body.signaturePlacement } : {}),
      ...(body.vatRegistered !== undefined ? { vatRegistered: body.vatRegistered } : {}),
      ...(body.documentLanguage !== undefined ? { documentLanguage: body.documentLanguage } : {}),
      ...(body.defaultRemark !== undefined ? { defaultRemark: body.defaultRemark } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
    .returning()
  return row ? senderProfileToWire(row) : null
}

export async function deleteSenderProfileImages(userId: string, id: string) {
  const [existing] = await db
    .select({ yourLogo: senderProfiles.yourLogo, signatureImage: senderProfiles.signatureImage })
    .from(senderProfiles)
    .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
    .limit(1)
  if (!existing) return
  await Promise.all([
    deleteDocumentImage(existing.yourLogo),
    deleteDocumentImage(existing.signatureImage),
  ])
}

export async function deleteSenderProfile(userId: string, id: string): Promise<boolean> {
  await deleteSenderProfileImages(userId, id)
  const [deleted] = await db
    .delete(senderProfiles)
    .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)))
    .returning()
  return !!deleted
}

export type RemarkDocumentType = 'QO' | 'INV' | 'RC'

const REMARK_DOCUMENT_TYPES: RemarkDocumentType[] = ['QO', 'INV', 'RC']

type RemarkTemplateInsert = {
  name: string
  body?: string
  defaultFor?: RemarkDocumentType[]
}

export function reassignRemarkDefaults<T extends { id: string; defaultFor: string[] }>(
  rows: T[],
  targetId: string | null,
  selectedTypes: readonly RemarkDocumentType[],
): T[] {
  const selected = new Set<string>(selectedTypes)
  return rows.map((row) => ({
    ...row,
    defaultFor: row.id === targetId
      ? [...selectedTypes]
      : row.defaultFor.filter((type) => !selected.has(type)),
  }))
}

export async function listRemarkTemplates(userId: string) {
  const rows = await db
    .select()
    .from(remarkTemplates)
    .where(eq(remarkTemplates.userId, userId))
    .orderBy(asc(remarkTemplates.position), asc(remarkTemplates.createdAt))
  return rows.map(remarkTemplateToWire)
}

export async function createRemarkTemplate(userId: string, body: RemarkTemplateInsert) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: remarkTemplates.id,
        position: remarkTemplates.position,
        defaultFor: remarkTemplates.defaultFor,
      })
      .from(remarkTemplates)
      .where(eq(remarkTemplates.userId, userId))
      .for('update')
    const nextPosition = rows.length > 0 ? Math.max(...rows.map((r) => r.position)) + 1 : 0
    const defaultFor = body.defaultFor ?? (rows.length === 0 ? REMARK_DOCUMENT_TYPES : [])
    const reassignedRows = reassignRemarkDefaults(rows, null, defaultFor)

    for (const [index, existing] of rows.entries()) {
      const reassigned = reassignedRows[index]
      if (reassigned.defaultFor.length !== existing.defaultFor.length) {
        await tx
          .update(remarkTemplates)
          .set({ defaultFor: reassigned.defaultFor, updatedAt: new Date() })
          .where(eq(remarkTemplates.id, existing.id))
      }
    }

    const [row] = await tx
      .insert(remarkTemplates)
      .values({
        userId,
        name: body.name,
        body: body.body ?? '',
        defaultFor,
        position: nextPosition,
      })
      .returning()
    return remarkTemplateToWire(row)
  })
}

export async function patchRemarkTemplate(
  userId: string,
  id: string,
  body: Partial<RemarkTemplateInsert>,
) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: remarkTemplates.id, defaultFor: remarkTemplates.defaultFor })
      .from(remarkTemplates)
      .where(eq(remarkTemplates.userId, userId))
      .for('update')
    if (!rows.some((row) => row.id === id)) return null

    if (body.defaultFor !== undefined) {
      const reassignedRows = reassignRemarkDefaults(rows, id, body.defaultFor)
      for (const [index, existing] of rows.entries()) {
        if (existing.id === id) continue
        const reassigned = reassignedRows[index]
        if (reassigned.defaultFor.length !== existing.defaultFor.length) {
          await tx
            .update(remarkTemplates)
            .set({ defaultFor: reassigned.defaultFor, updatedAt: new Date() })
            .where(eq(remarkTemplates.id, existing.id))
        }
      }
    }

    const [row] = await tx
      .update(remarkTemplates)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
        ...(body.defaultFor !== undefined ? { defaultFor: body.defaultFor } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(remarkTemplates.id, id), eq(remarkTemplates.userId, userId)))
      .returning()
    return row ? remarkTemplateToWire(row) : null
  })
}

export async function deleteRemarkTemplate(userId: string, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(remarkTemplates)
    .where(and(eq(remarkTemplates.id, id), eq(remarkTemplates.userId, userId)))
    .returning()
  return !!deleted
}

export async function setDefaultRemarkTemplate(
  userId: string,
  id: string,
  documentType: RemarkDocumentType,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: remarkTemplates.id, defaultFor: remarkTemplates.defaultFor })
      .from(remarkTemplates)
      .where(eq(remarkTemplates.userId, userId))
      .for('update')
    const target = rows.find((row) => row.id === id)
    if (!target) return false
    const selectedTypes = REMARK_DOCUMENT_TYPES.filter(
      (type) => target.defaultFor.includes(type) || type === documentType,
    )

    for (const row of reassignRemarkDefaults(rows, id, selectedTypes)) {
      await tx
        .update(remarkTemplates)
        .set({ defaultFor: row.defaultFor, updatedAt: new Date() })
        .where(eq(remarkTemplates.id, row.id))
    }
    return true
  })
}
