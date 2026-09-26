import { t } from 'elysia'

export {
  DocumentItemBody,
  CreateDocumentBody,
  UpdateDocumentBody,
  PromoteDocumentBody,
} from '@api/lib/db-schema'

export const LinkTransactionBody = t.Object({
  transactionId: t.String(),
})

export const PublishDocumentBody = t.Optional(t.Object({
  sendEmail: t.Optional(t.Boolean()),
}))

export const DocumentListQuery = t.Object({
  type: t.Optional(t.String()),
  projectId: t.Optional(t.String()),
  status: t.Optional(t.Union([t.Literal('draft'), t.Literal('published'), t.Literal('archived'), t.Literal('overdue')])),
  recurring: t.Optional(t.Boolean()),
  paid: t.Optional(t.Union([t.Literal('paid'), t.Literal('unpaid')])),
  search: t.Optional(t.String()),
  from: t.Optional(t.String()),
  to: t.Optional(t.String()),
  sort: t.Optional(t.Literal('issueDateDesc')),
  page: t.Optional(t.Numeric({ default: 1, minimum: 1 })),
  limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
})
