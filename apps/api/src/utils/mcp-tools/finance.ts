import { computeLifetimeFinancialSummary } from '@api/utils/financial-summary'
import { patchTransaction, deleteTransaction, listTransactions, createTransaction, bulkDeleteTransactions, getMonthlyBreakdown, getTransactionsByCategory, getRevenueByProject, getTaxEstimate, getProfitByMonth, markTransactionPaid, getTransactionsByProject, getProjectProfitability, getExpenseByWallet, getTransaction, importReceiptTransaction } from '@api/modules/finance/service'
import { getCashFlowForecast, getDashboardSnapshot, getRevenueThisQuarter } from '@api/modules/accounting/service'
import { queryUserContext, updateUserContext, queryAiSettings, updateAiSettings } from '@api/modules/user/service'
import { getCurrentMonthUsage } from '@api/modules/billing/usage'
import { db } from '@api/db'
import { users } from '@mana/db'
import { eq } from 'drizzle-orm'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'

export { getDashboardSnapshot } from '@api/modules/accounting/service'

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

function base64ToFile(name: string, mediaType: string, data: string) {
  const clean = data.replace(/^data:[^;]+;base64,/, '')
  return new File([Buffer.from(clean, 'base64')], name, { type: mediaType })
}

function receiptFileFromArgs(args: Record<string, unknown>, context?: ToolContext) {
  const fileName = typeof args.fileName === 'string' ? args.fileName : undefined
  const attachedFiles = context?.attachedFiles ?? []
  const attached = fileName
    ? attachedFiles.find((file) => file.name === fileName)
    : attachedFiles.length === 1
      ? attachedFiles[0]
      : undefined

  if (attached) return base64ToFile(attached.name, attached.mediaType, attached.data)

  if (
    typeof args.fileBase64 === 'string' &&
    typeof args.mediaType === 'string'
  ) {
    return base64ToFile(fileName ?? 'receipt', args.mediaType, args.fileBase64)
  }

  throw new Error('import_receipt_transaction requires an attached image fileName or fileBase64 and mediaType')
}

export const financeTools = [
  {
    name: 'get_transactions',
    description: 'List a bounded page of financial transactions, optionally filtered by type, status, project, reconciliation state, and date range. Use offset from the response to request the next page only when needed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['revenue', 'expense'] },
        status: { type: 'string' },
        projectId: { type: 'string' },
        unlinked: { type: 'boolean', description: 'Only transactions not linked to a document.' },
        needsReview: { type: 'boolean', description: 'Only AI-imported transactions waiting for review.' },
        dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
        dateTo: { type: 'string', description: 'YYYY-MM-DD' },
        limit: { type: 'number', minimum: 1, maximum: 100, description: 'Maximum rows to return (default 50, max 100)' },
        offset: { type: 'number', minimum: 0, description: 'Rows to skip for the next page (default 0)' },
      },
      required: [],
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Get financial summary: total revenue, expenses, runway months, monthly averages',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_cash_flow_forecast',
    description: 'Get a next-month cash-flow outlook from recurring revenue and the fixed three complete calendar months immediately before this month. Returns MRR, average monthly expenses, projected net, currency, and whether the expense average has any history.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_transaction',
    description: 'Create a new revenue or expense transaction',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['revenue', 'expense'] },
        amountCents: { type: 'number', description: 'Amount in cents' },
        description: { type: 'string' },
        category: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['type', 'amountCents', 'description', 'category', 'date'],
    },
  },
  {
    name: 'import_receipt_transaction',
    description: 'Import an attached receipt/bill image into Storage, extract transaction fields with AI, create an ai_receipt transaction, and leave it marked for review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fileName: { type: 'string', maxLength: 255, description: 'Attached receipt image filename. If one image is attached, this may be omitted.' },
        fileBase64: { type: 'string', maxLength: 7 * 1024 * 1024, description: 'Base64 image data fallback when no MCP attachment context is available (max 5 MB decoded).' },
        mediaType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], description: 'Required with fileBase64.' },
      },
      required: [],
    },
  },
  {
    name: 'update_transaction',
    description: 'Update fields on an existing transaction (type, amount, description, category, date, status, walletId, projectId, reference, notes, currency)',
    input_schema: {
      type: 'object' as const,
      properties: {
        transactionId: { type: 'string' },
        type: { type: 'string', enum: ['revenue', 'expense'] },
        amount: { type: 'number', description: 'Amount in dollars' },
        description: { type: 'string' },
        category: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        status: { type: 'string' },
        walletId: { type: 'string' },
        projectId: { type: 'string' },
        reference: { type: 'string' },
        notes: { type: 'string' },
        currency: { type: 'string' },
      },
      required: ['transactionId'],
    },
  },
  {
    name: 'delete_transaction',
    description: 'Permanently delete a transaction — this action cannot be undone',
    input_schema: {
      type: 'object' as const,
      properties: { transactionId: { type: 'string' } },
      required: ['transactionId'],
    },
  },
  {
    name: 'get_transaction',
    description: 'Get full details for a single transaction by ID',
    input_schema: {
      type: 'object' as const,
      properties: { transactionId: { type: 'string' } },
      required: ['transactionId'],
    },
  },
  {
    name: 'get_transactions_by_category',
    description: 'Get totals grouped by category: totalRevenue, totalExpenses, and net per category, sorted by absolute net descending',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_monthly_breakdown',
    description: 'Get monthly revenue vs expenses breakdown sorted by month ascending',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_revenue_by_project',
    description: 'Sum all revenue transactions grouped by project. Unlinked transactions appear under "Unassigned". Sorted by total revenue descending.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'mark_transaction_paid',
    description: 'Set a transaction\'s status to "paid"',
    input_schema: {
      type: 'object' as const,
      properties: { transactionId: { type: 'string' } },
      required: ['transactionId'],
    },
  },
  {
    name: 'get_tax_estimate',
    description:
      'Estimate Thai personal income tax for the current tax year, using the progressive brackets on net income (revenue minus logged expenses) after the THB 60,000 personal allowance. Returns taxYear, taxYearBE, filingDeadline, totalRevenue, totalExpenses, netIncome, estimatedTax, netAfterTax and a basis note. Use taxYearBE verbatim for the พ.ศ. year — never work it out yourself. Report the basis note: the standard 60% deduction and other allowances are not applied, so the real liability is usually lower.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_profit_by_month',
    description: 'Monthly revenue vs expenses breakdown with an additional cumulativeNet field showing running total net profit',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_user_context',
    description: 'Get user profile: name, hourly rate, currency, revenue goal, freelancer type',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_usage',
    description:
      'Get current resource usage and AI availability. MANA Community has no subscription limits; configured providers may charge for their services.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'update_user',
    description: 'Update user profile settings: name, hourlyRate, currency, revenueGoal, freelancerType, aiTone. Returns updated user context or {updated:false} if user not found.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        hourlyRate: { type: 'number', description: 'Hourly rate in user\'s currency' },
        currency: { type: 'string', description: 'ISO currency code e.g. USD, EUR' },
        revenueGoal: { type: 'number', description: 'Monthly revenue goal in user\'s currency' },
        freelancerType: { type: 'string', description: 'e.g. developer, designer, writer' },
        aiTone: { type: 'string', enum: ['balanced', 'professional', 'casual', 'direct'], description: 'AI assistant tone preference' },
      },
      required: [],
    },
  },
  {
    name: 'get_dashboard_snapshot',
    description: 'Get a full dashboard summary in one call: active projects, open/overdue tasks, this month revenue/expenses/net, upcoming tasks (next 7 days), and total file count. Ideal for morning briefings.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_project_profitability',
    description: 'Get net income for a project: revenue transactions minus expense transactions tagged to it',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_revenue_this_quarter',
    description: 'Get total revenue for the current calendar quarter, along with the quarter number and date range',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_transactions_by_project',
    description: 'List all transactions linked to a specific project',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_ai_settings',
    description: 'Read AI assistant settings: memory, proactive suggestions, voice, and tone preferences',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'update_ai_settings',
    description: 'Update AI assistant settings: aiMemory, aiProactive, aiVoiceEnabled, aiTone',
    input_schema: {
      type: 'object' as const,
      properties: {
        aiMemory: { type: 'boolean' },
        aiProactive: { type: 'boolean' },
        aiVoiceEnabled: { type: 'boolean' },
        aiTone: { type: 'string', enum: ['balanced', 'professional', 'casual', 'direct'] },
      },
      required: [],
    },
  },
  {
    name: 'get_expense_by_wallet',
    description: 'Get total expenses grouped by wallet/payment method. Unlinked transactions appear under "Unassigned". Sorted by total expenses descending.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'bulk_delete_transactions',
    description: 'Permanently delete multiple transactions by ID list. Returns count of deleted records. This action cannot be undone.',
    input_schema: {
      type: 'object' as const,
      properties: {
        transactionIds: { type: 'array', items: { type: 'string' }, description: 'List of transaction IDs to delete' },
      },
      required: ['transactionIds'],
    },
  },
] as const

export const financeHandlers: Record<string, McpToolHandler> = {
  'get_transactions': async (userId, args, context) => {
    const page = await listTransactions(userId, {
      type: typeof args.type === 'string' ? args.type : undefined,
      status: typeof args.status === 'string' ? args.status : undefined,
      projectId: typeof args.projectId === 'string' ? args.projectId : undefined,
      unlinked: args.unlinked === true,
      needsReview: args.needsReview === true,
      dateFrom: typeof args.dateFrom === 'string' ? args.dateFrom : undefined,
      dateTo: typeof args.dateTo === 'string' ? args.dateTo : undefined,
      limit: typeof args.limit === 'number' ? args.limit : 50,
      offset: typeof args.offset === 'number' ? args.offset : 0,
    })
    return context?.source === 'external-mcp' ? page : page.data
  },
  'get_financial_summary': (userId) => computeLifetimeFinancialSummary(userId),
  'get_cash_flow_forecast': (userId) => getCashFlowForecast(userId),
  'create_transaction': async (userId, args) => {
    if (
      typeof args.type !== 'string' ||
      typeof args.amountCents !== 'number' ||
      typeof args.description !== 'string' ||
      typeof args.category !== 'string' ||
      typeof args.date !== 'string'
    ) {
      throw new Error('create_transaction requires type, amountCents, description, category, date')
    }
    if (args.amountCents <= 0) throw new Error('create_transaction requires a positive amountCents')
    return createTransaction(userId, {
      type: args.type,
      amount: args.amountCents / 100,
      description: args.description,
      category: args.category,
      date: args.date,
      currency: typeof args.currency === 'string' ? args.currency : undefined,
    })
  },
  'import_receipt_transaction': async (userId, args, context) => {
    const file = receiptFileFromArgs(args, context)
    return importReceiptTransaction(userId, file)
  },
  'update_transaction': async (userId, args) => {
    if (typeof args.transactionId !== 'string') throw new Error('update_transaction requires transactionId')
    if (typeof args.amount === 'number' && args.amount <= 0) {
      throw new Error('update_transaction requires a positive amount')
    }
    const result = await patchTransaction(userId, args.transactionId, {
      type: typeof args.type === 'string' ? args.type : undefined,
      amount: typeof args.amount === 'number' ? args.amount : undefined,
      description: typeof args.description === 'string' ? args.description : undefined,
      category: typeof args.category === 'string' ? args.category : undefined,
      date: typeof args.date === 'string' ? args.date : undefined,
      status: typeof args.status === 'string' ? args.status : undefined,
      walletId: typeof args.walletId === 'string' ? args.walletId : undefined,
      projectId: typeof args.projectId === 'string' ? args.projectId : undefined,
      reference: typeof args.reference === 'string' ? args.reference : undefined,
      notes: typeof args.notes === 'string' ? args.notes : undefined,
      currency: typeof args.currency === 'string' ? args.currency : undefined,
    })
    return result ?? { updated: false }
  },
  'delete_transaction': async (userId, args) => {
    if (typeof args.transactionId !== 'string') throw new Error('delete_transaction requires transactionId')
    await deleteTransaction(userId, args.transactionId)
    return { deleted: true, transactionId: args.transactionId }
  },
  'get_transaction': async (userId, args) => {
    if (typeof args.transactionId !== 'string') throw new Error('get_transaction requires transactionId')
    const row = await getTransaction(userId, args.transactionId)
    return row ?? { found: false }
  },
  'get_transactions_by_category': (userId) => getTransactionsByCategory(userId),
  'get_monthly_breakdown': (userId) => getMonthlyBreakdown(userId),
  'get_revenue_by_project': (userId) => getRevenueByProject(userId),
  'mark_transaction_paid': async (userId, args) => {
    if (typeof args.transactionId !== 'string') throw new Error('mark_transaction_paid requires transactionId')
    return markTransactionPaid(userId, args.transactionId)
  },
  'get_tax_estimate': (userId) => getTaxEstimate(userId),
  'get_profit_by_month': (userId) => getProfitByMonth(userId),
  'get_user_context': (userId) => queryUserContext(userId),
  'get_usage': async (userId) => {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
    if (!user) return { found: false }
    const usage = await getCurrentMonthUsage(userId)
    return usage
  },
  'update_user': async (userId, args) => {
    return updateUserContext(userId, {
      name: typeof args.name === 'string' ? args.name : undefined,
      hourlyRate: typeof args.hourlyRate === 'number' ? args.hourlyRate : undefined,
      currency: typeof args.currency === 'string' ? args.currency : undefined,
      revenueGoal: typeof args.revenueGoal === 'number' ? args.revenueGoal : undefined,
      freelancerType: typeof args.freelancerType === 'string' ? args.freelancerType : undefined,
      aiTone: typeof args.aiTone === 'string' ? args.aiTone : undefined,
    })
  },
  'get_dashboard_snapshot': (userId) => getDashboardSnapshot(userId),
  'get_project_profitability': async (userId, args) => {
    if (typeof args.projectId !== 'string') throw new Error('get_project_profitability requires projectId')
    return getProjectProfitability(userId, args.projectId)
  },
  'get_revenue_this_quarter': (userId) => getRevenueThisQuarter(userId),
  'get_transactions_by_project': async (userId, args) => {
    if (typeof args.projectId !== 'string') throw new Error('get_transactions_by_project requires projectId')
    return getTransactionsByProject(userId, args.projectId)
  },
  'get_ai_settings': (userId) => queryAiSettings(userId),
  'update_ai_settings': async (userId, args) => {
    return updateAiSettings(userId, {
      aiMemory: typeof args.aiMemory === 'boolean' ? args.aiMemory : undefined,
      aiProactive: typeof args.aiProactive === 'boolean' ? args.aiProactive : undefined,
      aiVoiceEnabled: typeof args.aiVoiceEnabled === 'boolean' ? args.aiVoiceEnabled : undefined,
      aiTone: typeof args.aiTone === 'string' ? args.aiTone : undefined,
    })
  },
  'get_expense_by_wallet': (userId) => getExpenseByWallet(userId),
  'bulk_delete_transactions': async (userId, args) => {
    if (!Array.isArray(args.transactionIds)) throw new Error('bulk_delete_transactions requires transactionIds array')
    return bulkDeleteTransactions(userId, args.transactionIds.filter((id): id is string => typeof id === 'string'))
  },
}
