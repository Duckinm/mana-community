import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { listBudgets, upsertBudget, patchBudget, deleteBudget } from '@api/modules/budgets/service'
import { BudgetResponse, BudgetsListResponse, NotFoundResponse } from '@api/modules/wallets/responses'
import { CreateBudgetBody, UpdateBudgetBody } from '@api/lib/db-schema'
import { NoContentResponse } from '@api/lib/wire-schema'

export const budgetsModule = new Elysia({ name: 'budgets', prefix: '/api/budgets' })
  .use(betterAuthPlugin)

  .get('/', async ({ user }) => {
    return listBudgets(user.id)
  }, {
    auth: true,
    response: { 200: BudgetsListResponse },
    detail: { tags: ['Budgets'], summary: 'List budgets' },
  })

  .post('/', async ({ body, user, status }) => {
    const { created, budget } = await upsertBudget(user.id, body)
    return status(created ? 201 : 200, budget)
  }, {
    auth: true,
    body: CreateBudgetBody,
    response: { 200: BudgetResponse, 201: BudgetResponse },
    detail: { tags: ['Budgets'], summary: 'Create or update a budget' },
  })

  .patch('/:id', async ({ params, user, body, status }) => {
    const row = await patchBudget(user.id, params.id, body)
    if (!row) return status(404, { message: 'Not found' })
    return row
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    body: UpdateBudgetBody,
    response: { 200: BudgetResponse, 404: NotFoundResponse },
    detail: { tags: ['Budgets'], summary: 'Update a budget' },
  })

  .delete('/:id', async ({ params, user, status }) => {
    const deleted = await deleteBudget(user.id, params.id)
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['Budgets'], summary: 'Delete a budget' },
  })
