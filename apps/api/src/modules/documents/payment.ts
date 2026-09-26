import { createTransaction } from '@api/modules/finance/service'
import { reconcile } from '@api/modules/reconciliation/service'

type RecordDocumentPaymentInput = {
  userId: string
  documentId: string
  documentNumber: string
  amountCents: number
  currency: string
  date: string
  description: string
  category?: string
  status: 'paid' | 'received'
  walletId?: string | null
  projectId?: string | null
  source?: 'promptpay_slip'
}

export async function recordDocumentPayment(input: RecordDocumentPaymentInput) {
  const transaction = await createTransaction(input.userId, {
    type: 'revenue',
    amount: input.amountCents / 100,
    description: input.description,
    category: input.category,
    currency: input.currency,
    date: input.date,
    status: input.status,
    walletId: input.walletId ?? undefined,
    projectId: input.projectId ?? undefined,
    source: input.source,
  })
  return reconcile(input.userId, input.documentId, transaction.id)
}
