import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'
import { queryKeys } from '@/lib/query-keys'
import { invalidateTransactions } from '@/lib/invalidate-helpers'
import type { Transaction } from '@/components/finance/types'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { mergeCategoryLists } from '@/lib/merge-category-lists'

interface BudgetRow {
  category: string
}

const PLACEHOLDER_BUDGET_CENTS = 100

export interface FinanceContextValue {
  budgetCategories: string[]
  addBudgetCategory: (name: string) => void
  refetch: () => void
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>
  updateTransaction: (tx: Transaction) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}

function useFinanceContextValue(): FinanceContextValue {
  const queryClient = useQueryClient()

  const { data: budgets = [] } = useQuery<BudgetRow[]>({
    queryKey: queryKeys.budgets,
    queryFn: async () => {
      const result = await client.api.budgets.get()
      if (result.error) throw result.error
      return (result.data ?? []) as BudgetRow[]
    },
    staleTime: 60_000,
  })

  const budgetCategories = useMemo(
    () => mergeCategoryLists(budgets.map((b) => b.category)),
    [budgets],
  )

  const addBudgetCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return

      const listResult = await client.api.budgets.get()
      if (listResult.error) throw listResult.error
      const rows = (listResult.data ?? []) as BudgetRow[]
      if (rows.some((b) => b.category.toLowerCase() === trimmed.toLowerCase())) {
        return
      }

      const result = await client.api.budgets.post({
        category: trimmed,
        amountCents: PLACEHOLDER_BUDGET_CENTS,
        period: 'monthly',
      })
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accountingChart })
    },
  })

  const addBudgetCategory = useCallback(
    (name: string) => {
      addBudgetCategoryMutation.mutate(name)
    },
    [addBudgetCategoryMutation],
  )

  const addMutation = useMutation({
    mutationFn: async (tx: Omit<Transaction, 'id'>) =>
      expectEden(await client.api.finance.transactions.post(tx)),
    onSuccess: () => { void invalidateTransactions(queryClient) },
    onError: (_err, tx) => toast.error(i18next.t('toast.createTransactionFailed', { ns: 'accounting' }), {
      action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => addMutation.mutate(tx) },
    }),
  })

  const updateMutation = useMutation({
    mutationFn: async (tx: Transaction) =>
      expectEden(await client.api.finance.transactions({ id: tx.id }).patch(tx)),
    onSuccess: (_data, tx) => {
      void invalidateTransactions(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.transaction(tx.id) })
    },
    onError: (_err, tx) => toast.error(i18next.t('toast.saveTransactionFailed', { ns: 'accounting' }), {
      action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => updateMutation.mutate(tx) },
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      expectEdenVoid(await client.api.finance.transactions({ id }).delete()),
    onSuccess: (_data, id) => {
      void invalidateTransactions(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.transaction(id) })
    },
    onError: (_err, id) => toast.error(i18next.t('toast.deleteTransactionFailed', { ns: 'accounting' }), {
      action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => deleteMutation.mutate(id) },
    }),
  })

  const refetch = () => { void invalidateTransactions(queryClient) }
  const addTransaction = async (tx: Omit<Transaction, 'id'>): Promise<void> => { await addMutation.mutateAsync(tx) }
  const updateTransaction = async (tx: Transaction): Promise<void> => { await updateMutation.mutateAsync(tx) }
  const deleteTransaction = async (id: string): Promise<void> => { await deleteMutation.mutateAsync(id) }

  return {
    budgetCategories,
    addBudgetCategory,
    refetch,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const value = useFinanceContextValue()
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}
