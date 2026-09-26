import { db } from '@api/db'
import { NotFoundError } from '@api/lib/errors'
import { transitionDocument, type DocumentStatus } from '@api/lib/document-status'
import { documents } from '@mana/db'
import { and, eq } from 'drizzle-orm'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DbClient = typeof db | DbTransaction

export async function markDocumentPaid(
  userId: string,
  documentId: string,
  paidDate: string,
  tx: DbClient = db,
) {
  const [document] = await tx
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
  if (!document) throw new NotFoundError('Document not found')

  const patch: Partial<typeof documents.$inferInsert> = {
    status: transitionDocument(document.status as DocumentStatus, 'reconcile'),
    updatedAt: new Date(),
  }
  if (!document.paidAt) patch.paidAt = paidDate

  const [updated] = await tx
    .update(documents)
    .set(patch)
    .where(eq(documents.id, documentId))
    .returning()
  return updated
}

export async function clearDocumentPaid(
  userId: string,
  documentId: string,
  tx: DbClient = db,
) {
  const [document] = await tx
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
  if (!document) throw new NotFoundError('Document not found')
  if (!document.paidAt) return document

  const [updated] = await tx
    .update(documents)
    .set({ paidAt: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning()
  return updated
}

export async function syncDocumentPaidDate(
  userId: string,
  documentId: string,
  paidDate: string,
  tx: DbClient = db,
) {
  await tx
    .update(documents)
    .set({ paidAt: paidDate, updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
}
