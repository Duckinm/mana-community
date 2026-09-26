import { TransactionsPage } from '@/components/finance/transactions-page'
import { FinanceProvider } from '@/context/finance'
import { optionalCalendarDateSchema } from '@/lib/calendar-date'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  txId: z.string().optional(),
  q: z.string().catch(''),
  type: z.enum(['all', 'revenue', 'expense']).catch('all'),
  status: z.enum(['all', 'received', 'pending', 'overdue', 'paid']).catch('all'),
  walletId: z.string().optional(),
  from: optionalCalendarDateSchema,
  to: optionalCalendarDateSchema,
  needsReview: z.boolean().optional(),
})

const searchDefaults = {
  txId: undefined,
  q: '',
  type: 'all' as const,
  status: 'all' as const,
  walletId: undefined,
  from: undefined,
  to: undefined,
  needsReview: false,
}

export const Route = createFileRoute('/_app/accounting/transactions')({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: () => (
    <FinanceProvider>
      <TransactionsPage />
    </FinanceProvider>
  ),
})
