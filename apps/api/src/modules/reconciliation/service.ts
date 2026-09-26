import { db } from '@api/db'
import { documents, transactions } from '@mana/db'
import { and, eq } from 'drizzle-orm'
import { logActivity } from '@api/lib/activity'
import { markDocumentPaid, clearDocumentPaid, syncDocumentPaidDate, getDocument } from '@api/modules/documents/service'
import { ConflictError, ValidationError } from '@api/lib/errors'
import { createNotification } from '@api/modules/notifications/create'

/** Compares a transaction's amount against what the document actually expects, flagging + notifying on mismatch. */
async function checkAmountMismatch(userId: string, transactionId: string, transactionAmountCents: number, documentAmountDueCents: number): Promise<string | undefined> {
  if (transactionAmountCents === documentAmountDueCents) return undefined

  const warning = `Transaction amount (${transactionAmountCents}) does not match document amount due (${documentAmountDueCents})`
  await createNotification({
    userId,
    title: 'Reconciliation flagged',
    body: warning,
    key: 'reconciliationFlagged',
    params: { transaction: transactionAmountCents, document: documentAmountDueCents },
    link: `/accounting/transactions?txId=${encodeURIComponent(transactionId)}`,
    event: 'reconciliationAttention',
  })
  return warning
}

export async function reconcile(userId: string, documentId: string, transactionId: string) {
  return db.transaction(async (tx) => {
    const [transaction] = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))

    if (transaction.documentId && transaction.documentId !== documentId) {
      throw new ConflictError('Transaction is already linked to a different document')
    }

    const [updatedTx] = await tx
      .update(transactions)
      .set({ documentId, updatedAt: new Date() })
      .where(eq(transactions.id, transactionId))
      .returning()

    const updatedDoc = await markDocumentPaid(userId, documentId, transaction.date, tx)

    logActivity({
      userId,
      entityType: 'document',
      entityId: documentId,
      action: 'paid',
      summaryKey: 'activity:document.linkedToPayment',
      summaryParams: { label: `${updatedDoc.type} ${updatedDoc.number}` },
      contactId: updatedDoc.contactId ?? null,
      projectId: updatedDoc.projectId ?? null,
      metadata: { transactionId },
    })

    const warning = await checkAmountMismatch(userId, transaction.id, transaction.amountCents, updatedDoc.amountDueCents)

    return { document: updatedDoc, transaction: updatedTx, warning }
  })
}

/**
 * Resync a transaction's reconciliation state after a patch. Decides between
 * reconcile, unreconcile, or an in-place sync of the linked document based on
 * how `documentId`, `date`, and `amountCents` changed.
 */
export async function resyncReconciliation(
  userId: string,
  existing: typeof transactions.$inferSelect,
  updated: typeof transactions.$inferSelect,
): Promise<{ warning?: string }> {
  if (existing.documentId !== updated.documentId) {
    if (updated.documentId === null) {
      await unreconcile(userId, updated.id)
    } else {
      const { warning } = await reconcile(userId, updated.documentId, updated.id)
      return { warning }
    }
    return {}
  }

  if (!existing.documentId) return {}

  if (existing.date !== updated.date) {
    await syncDocumentPaidDate(userId, existing.documentId, updated.date)
  }

  if (existing.amountCents !== updated.amountCents) {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, existing.documentId))

    const warning = await checkAmountMismatch(userId, updated.id, updated.amountCents, document.amountDueCents)
    if (warning) return { warning }
  }

  return {}
}

export async function unreconcile(userId: string, transactionId: string) {
  return db.transaction(async (tx) => {
    const [transaction] = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))

    const [updatedTx] = await tx
      .update(transactions)
      .set({ documentId: null, updatedAt: new Date() })
      .where(eq(transactions.id, transactionId))
      .returning()

    if (!transaction.documentId) {
      return { document: null, transaction: updatedTx }
    }

    const updatedDoc = await clearDocumentPaid(userId, transaction.documentId, tx)

    logActivity({
      userId,
      entityType: 'document',
      entityId: updatedDoc.id,
      action: 'updated',
      summaryKey: 'activity:document.unreconciled',
      summaryParams: { type: updatedDoc.type, number: updatedDoc.number },
      contactId: updatedDoc.contactId ?? null,
      projectId: updatedDoc.projectId ?? null,
      metadata: { transactionId },
    })

    return { document: updatedDoc, transaction: updatedTx }
  })
}

/** Unlink the transaction reconciled against a document, reverting it to published. */
export async function unlinkDocumentTransaction(userId: string, documentId: string) {
  const doc = await getDocument(userId, documentId)

  const [transaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.documentId, documentId)))
    .limit(1)
  if (!transaction) throw new ValidationError('No transaction linked to this document')

  await unreconcile(userId, transaction.id)

  return getDocument(userId, doc.id)
}
