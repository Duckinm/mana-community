import { t } from 'elysia'
import {
  ContactListRowResponse,
  ContactResponse,
  ContactsListResponse,
  CreateContactBody,
  LinkedProjectSummary,
  UpdateContactBody,
} from '@api/lib/db-schema'
import { IsoInstant, NullableIsoInstant, NotFoundResponse } from '@api/lib/wire-schema'

export {
  ContactResponse,
  ContactListRowResponse,
  ContactsListResponse,
  CreateContactBody,
  UpdateContactBody,
  LinkedProjectSummary,
  NotFoundResponse,
}

export const ContactBriefingPayload = t.Object({
  contact: ContactListRowResponse,
  projects: t.Array(LinkedProjectSummary),
  recentActivity: t.Array(t.Object({
    action: t.String(),
    summaryKey: t.String(),
    summaryParams: t.Nullable(t.String()),
    createdAt: IsoInstant,
  })),
  totalRevenueCents: t.Number(),
  openInvoiceCount: t.Number(),
  daysSinceLastContact: t.Union([t.Number(), t.Null()]),
  recommendedAction: t.String(),
})

export const ContactBriefingResponse = t.Object({
  cached: t.Boolean(),
  checkedAt: NullableIsoInstant,
  briefing: t.Union([ContactBriefingPayload, t.Null()]),
})

export const ImportContactRow = t.Object({
  name: t.Optional(t.String()),
  email: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  company: t.Optional(t.String()),
  notes: t.Optional(t.String()),
})

export const ImportContactsBody = t.Object({
  rows: t.Array(ImportContactRow),
})

export const BulkDeleteBody = t.Object({
  ids: t.Array(t.String()),
})

export const MergeContactBody = t.Object({
  mergeIntoId: t.String(),
})

export const ImportVcardBody = t.Object({
  vcf: t.String(),
})
