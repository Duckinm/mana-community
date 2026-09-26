import type { wallets, budgets } from '@mana/db'
import { wireTimestamps, type WireTimestamps } from '@api/lib/wire-row'

type WalletRow = typeof wallets.$inferSelect
type BudgetRow = typeof budgets.$inferSelect

const WALLET_KEYS = ['createdAt', 'updatedAt'] as const satisfies readonly (keyof WalletRow)[]
const BUDGET_KEYS = ['createdAt', 'updatedAt'] as const satisfies readonly (keyof BudgetRow)[]

export function walletToWire<T extends WalletRow>(row: T): WireTimestamps<T, typeof WALLET_KEYS[number]> {
  return wireTimestamps(row, WALLET_KEYS)
}

export function budgetToWire<T extends BudgetRow>(row: T): WireTimestamps<T, typeof BUDGET_KEYS[number]> {
  return wireTimestamps(row, BUDGET_KEYS)
}
