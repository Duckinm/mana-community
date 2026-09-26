import { createInsertSchema, createUpdateSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { transactions, wallets, budgets, categories } from '@mana/db'

// The wire speaks decimal `amount`; the DB stores integer `amountCents`.
const transactionRefine = {
  projectId: t.Optional(t.String()),
  reference: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  currency: t.Optional(t.String()),
  recurringInterval: t.Optional(t.String()),
}

const _transactionInsert = createInsertSchema(transactions, transactionRefine)
export const CreateTransactionBody = t.Composite([
  t.Omit(_transactionInsert, [
    'id',
    'userId',
    'amountCents',
    'reviewedAt',
    'aiFlags',
    'createdAt',
    'updatedAt',
  ]),
  t.Object({ amount: t.Number({ exclusiveMinimum: 0 }) }),
])

const _transactionUpdate = createUpdateSchema(transactions, {
  ...transactionRefine,
  reviewedAt: t.Optional(t.Nullable(t.String())),
})
export const UpdateTransactionBody = t.Composite([
  t.Omit(_transactionUpdate, [
    'id',
    'userId',
    'amountCents',
    'source',
    'aiFlags',
    'createdAt',
    'updatedAt',
  ]),
  t.Object({ amount: t.Optional(t.Number({ exclusiveMinimum: 0 })) }),
])

const walletRefine = {
  lastFour: t.Optional(t.String()),
  bankName: t.Optional(t.String()),
  accountNumber: t.Optional(t.String()),
  accountName: t.Optional(t.String()),
  swiftCode: t.Optional(t.String()),
  promptPayId: t.Optional(t.String()),
  cardNumber: t.Optional(t.String()),
  cardExpiry: t.Optional(t.String()),
  cardholderName: t.Optional(t.String()),
}

const _walletInsert = createInsertSchema(wallets, { ...walletRefine, type: t.String() })
export const CreateWalletBody = t.Omit(_walletInsert, ['id', 'userId', 'createdAt', 'updatedAt'])

const _walletUpdate = createUpdateSchema(wallets, walletRefine)
export const UpdateWalletBody = t.Omit(_walletUpdate, ['id', 'userId', 'createdAt', 'updatedAt'])

const _budgetInsert = createInsertSchema(budgets)
export const CreateBudgetBody = t.Composite([
  t.Omit(_budgetInsert, ['id', 'userId', 'amountCents', 'createdAt', 'updatedAt']),
  t.Object({ amountCents: t.Integer({ exclusiveMinimum: 0 }) }),
])

const _budgetUpdate = createUpdateSchema(budgets)
export const UpdateBudgetBody = t.Composite([
  t.Omit(_budgetUpdate, ['id', 'userId', 'amountCents', 'createdAt', 'updatedAt']),
  t.Object({ amountCents: t.Optional(t.Integer({ exclusiveMinimum: 0 })) }),
])

const _categoryInsert = createInsertSchema(categories, {
  type: t.Union([t.Literal('revenue'), t.Literal('expense')]),
})
export const CreateCategoryBody = t.Pick(_categoryInsert, ['name', 'type'])
