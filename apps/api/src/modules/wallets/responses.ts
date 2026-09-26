import { t } from 'elysia'
import {
  BudgetResponse,
  BudgetsListResponse,
  WalletResponse,
  WalletsListResponse,
} from '@api/lib/db-schema'
import { NotFoundResponse } from '@api/lib/wire-schema'

export {
  WalletResponse,
  WalletsListResponse,
  BudgetResponse,
  BudgetsListResponse,
  NotFoundResponse,
}

export const BudgetUpsertResponse = t.Object({
  created: t.Boolean(),
  budget: BudgetResponse,
})
