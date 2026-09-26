import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { senderProfiles, remarkTemplates } from '@mana/db'
import { IsoInstant } from '@api/lib/wire-schema'

export const SenderProfileResponse = t.Composite([
  createSelectSchema(senderProfiles, {
    createdAt: IsoInstant,
    updatedAt: IsoInstant,
  }),
  // Derived from userId (see modules/documents/send-etax.ts etaxFromEmail) — not a DB column.
  t.Object({ etaxFromEmail: t.String() }),
])
export const SenderProfilesListResponse = t.Array(SenderProfileResponse)

const senderProfileRefine = {
  registeredName: t.Optional(t.String()),
  registeredNameEn: t.Optional(t.String()),
  yourEmail: t.Optional(t.String()),
  yourPhone: t.Optional(t.String()),
  yourAddress: t.Optional(t.String()),
  yourAddressEn: t.Optional(t.String()),
  yourAddressZip: t.Optional(t.String()),
  yourAddressCountry: t.Optional(t.String()),
  registeredAddress: t.Optional(t.String()),
  registeredAddressEn: t.Optional(t.String()),
  yourCountry: t.Optional(t.String()),
  yourZip: t.Optional(t.String()),
  yourTaxId: t.Optional(t.String()),
  yourBranchNumber: t.Optional(t.String()),
  yourLogo: t.Optional(t.String()),
  signatureImage: t.Optional(t.String()),
  signaturePlacement: t.Optional(t.String()),
  defaultRemark: t.Optional(t.String()),
}

const _senderProfileInsert = createInsertSchema(senderProfiles, senderProfileRefine)
export const CreateSenderProfileBody = t.Omit(_senderProfileInsert, [
  'id',
  'userId',
  'createdAt',
  'updatedAt',
])

const _senderProfileUpdate = createUpdateSchema(senderProfiles, senderProfileRefine)
export const UpdateSenderProfileBody = t.Omit(_senderProfileUpdate, [
  'id',
  'userId',
  'createdAt',
  'updatedAt',
])

export const RemarkTemplateResponse = createSelectSchema(remarkTemplates, {
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})
export const RemarkTemplatesListResponse = t.Array(RemarkTemplateResponse)

const RemarkDocumentTypeSchema = t.Union([
  t.Literal('QO'),
  t.Literal('INV'),
  t.Literal('RC'),
])

export const CreateRemarkTemplateBody = t.Object({
  name: t.String(),
  body: t.Optional(t.String()),
  defaultFor: t.Optional(t.Array(RemarkDocumentTypeSchema, { maxItems: 3, uniqueItems: true })),
})

export const UpdateRemarkTemplateBody = t.Object({
  name: t.Optional(t.String()),
  body: t.Optional(t.String()),
  defaultFor: t.Optional(t.Array(RemarkDocumentTypeSchema, { maxItems: 3, uniqueItems: true })),
})

export const SetDefaultRemarkTemplateBody = t.Object({
  documentType: RemarkDocumentTypeSchema,
})
