import type { TransactionStatus, TransactionType } from '@/components/finance/types'
import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'

export const TRANSACTIONS_PAGE_SIZE = 10

export type TransactionListFilters = {
  q?: string
  type?: 'all' | TransactionType
  status?: 'all' | TransactionStatus
  walletId?: string
  from?: string
  to?: string
  needsReview?: boolean
}

export function useTransactionsInfinite(filters: TransactionListFilters) {
  const queryFilters = {
    q: filters.q?.trim() || undefined,
    type: filters.type,
    status: filters.status,
    walletId: filters.walletId,
    from: filters.from,
    to: filters.to,
    needsReview: filters.needsReview || undefined,
  }

  return useInfiniteQuery({
    queryKey: queryKeys.transactionsList(queryFilters),
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) =>
      expectEden(
        await client.api.finance.transactions.get({
          query: {
            q: queryFilters.q,
            type: queryFilters.type,
            status: queryFilters.status,
            walletId: queryFilters.walletId,
            dateFrom: queryFilters.from,
            dateTo: queryFilters.to,
            needsReview: queryFilters.needsReview ? 'true' : undefined,
            limit: String(TRANSACTIONS_PAGE_SIZE),
            offset: String(pageParam),
          },
        }),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
  })
}
