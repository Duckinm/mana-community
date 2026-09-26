import { parseTransactionType, parseTransactionStatus } from '@api/lib/wire-enums'
import type { Static } from 'elysia'
import type { CreateTransactionBody, UpdateTransactionBody } from '@api/modules/finance/model'
import { db } from '@api/db'
import { fileLinks, transactions, projects, wallets } from '@mana/db'
import { eq, and, desc, gte, lte, or, ilike, sql, isNull, inArray } from 'drizzle-orm'
import { logActivity } from '@api/lib/activity'
import { activityScopeForProject, buildPatchActivity } from '@api/lib/activity-helpers'
import { reconcile, resyncReconciliation } from '@api/modules/reconciliation/service'
import { aggregateWithConverter, convertTransactionAmounts } from '@api/lib/accounting-aggregation'
import { extractReceiptTransaction, type ReceiptFlag } from '@api/modules/ai/service'
import { uploadFile } from '@api/modules/storage/service'
import { createNotification } from '@api/modules/notifications/create'
import { checkBudgetThreshold } from '@api/modules/budgets/service'
import { getUserBaseCurrency, buildConverterForBase } from '@api/lib/exchange-rates'
import { estimateThaiIncomeTax } from '@api/lib/thai-pit'

const RECEIPT_FLAG_MESSAGE: Record<ReceiptFlag, string> = {
  uncertain_currency: 'the currency was unclear and defaulted to your base currency',
  uncertain_amount: 'the total amount was unclear',
  unclear_image: 'the receipt image was hard to read',
}

const DEFAULT_TRANSACTION_LIMIT = 10
const MAX_TRANSACTION_LIMIT = 100

export function buildTransactionConditions(
  userId: string,
  opts: {
    type?: string
    status?: string
    walletId?: string
    projectId?: string
    dateFrom?: string
    dateTo?: string
    q?: string
    unlinked?: boolean
    needsReview?: boolean
  },
) {
  const conditions = [eq(transactions.userId, userId)]
  if (opts.needsReview) {
    conditions.push(eq(transactions.source, 'ai_receipt'), isNull(transactions.reviewedAt))
  }
  if (opts.type && opts.type !== 'all') conditions.push(eq(transactions.type, opts.type))
  if (opts.status && opts.status !== 'all') conditions.push(eq(transactions.status, opts.status))
  if (opts.walletId) conditions.push(eq(transactions.walletId, opts.walletId))
  if (opts.projectId) conditions.push(eq(transactions.projectId, opts.projectId))
  if (opts.dateFrom) conditions.push(gte(transactions.date, opts.dateFrom))
  if (opts.dateTo) conditions.push(lte(transactions.date, opts.dateTo))
  if (opts.unlinked) conditions.push(isNull(transactions.documentId))
  if (opts.q?.trim()) {
    const term = `%${opts.q.trim()}%`
    conditions.push(
      or(
        ilike(transactions.description, term),
        ilike(transactions.category, term),
        ilike(transactions.reference, term),
      )!,
    )
  }
  return conditions
}

/** Convert a DB transaction row to the public API response shape (amount in dollars) */
export function toTx(row: typeof transactions.$inferSelect) {
  return {
    id: row.id,
    type: parseTransactionType(row.type),
    amount: row.amountCents / 100,
    description: row.description,
    category: row.category,
    date: row.date,
    status: parseTransactionStatus(row.status),
    walletId: row.walletId ?? null,
    projectId: row.projectId ?? undefined,
    reference: row.reference ?? undefined,
    notes: row.notes ?? undefined,
    currency: row.currency ?? 'USD',
    source: row.source === 'ai_receipt' ? 'ai_receipt' as const : 'manual' as const,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    aiFlags: row.aiFlags ? (JSON.parse(row.aiFlags) as string[]) : [],
    isRecurring: row.isRecurring,
    recurringInterval: row.recurringInterval ?? undefined,
    documentId: row.documentId ?? undefined,
  }
}

/** List transactions for a user with optional filters (applied in SQL) */
export async function listTransactions(
  userId: string,
  opts: {
    limit?: number
    offset?: number
    type?: string
    status?: string
    walletId?: string
    projectId?: string
    dateFrom?: string
    dateTo?: string
    q?: string
    unlinked?: boolean
    needsReview?: boolean
  } = {},
) {
  const limit = Math.min(MAX_TRANSACTION_LIMIT, Math.max(1, opts.limit ?? DEFAULT_TRANSACTION_LIMIT))
  const offset = Math.max(0, opts.offset ?? 0)
  const conditions = buildTransactionConditions(userId, opts)
  const where = and(...conditions)

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(where),
  ])

  const total = countRows[0]?.count ?? 0

  return {
    data: rows.map(toTx),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  }
}

export async function getRevenueRecord(userId: string) {
  const [row] = await db
    .select({ amountCents: sql<number>`coalesce(max(${transactions.amountCents}), 0)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'revenue')))

  return { amount: (row?.amountCents ?? 0) / 100 }
}

/** Fetch a single transaction for a user */
export async function getTransaction(userId: string, txId: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)))
    .limit(1)

  return row ? toTx(row) : null
}

/** Insert a new transaction and return the public shape */
export async function createTransaction(
  userId: string,
  body: Static<typeof CreateTransactionBody> & {
    aiFlags?: string[]
    reviewedAt?: Date | null
  },
) {
  const category = body.category ?? ''

  const [row] = await db.insert(transactions).values({
    userId,
    type: body.type,
    amountCents: Math.round(body.amount * 100),
    description: body.description,
    category,
    date: body.date,
    status: body.status ?? 'pending',
    walletId: body.walletId ?? null,
    projectId: body.projectId ?? null,
    reference: body.reference ?? null,
    notes: body.notes ?? null,
    currency: body.currency ?? (await getUserBaseCurrency(userId)),
    source: body.source ?? 'manual',
    isRecurring: body.isRecurring ?? false,
    recurringInterval: body.recurringInterval ?? null,
    aiFlags: JSON.stringify(body.aiFlags ?? []),
    reviewedAt: body.reviewedAt ?? null,
  }).returning()
  const scope = await activityScopeForProject(userId, body.projectId ?? null)
  logActivity({
    userId,
    entityType: 'transaction',
    entityId: row.id,
    action: 'created',
    summaryKey: 'activity:transaction.created',
    summaryParams: { type: body.type, description: body.description, amount: body.amount },
    projectId: scope.projectId,
    contactId: scope.contactId,
  })

  if (row.type === 'expense' && row.category) {
    await checkBudgetThreshold(userId, row.category, row.amountCents)
  }

  // Linking at entry time goes through the same reconcile path as linking later,
  // so the document is marked paid and amount mismatches are flagged either way.
  if (body.documentId) {
    const { transaction, warning } = await reconcile(userId, body.documentId, row.id)
    return { ...toTx(transaction), warning }
  }

  return toTx(row)
}

/** Patch a transaction, return updated public shape or null if not found */
export async function patchTransaction(
  userId: string,
  txId: string,
  body: Static<typeof UpdateTransactionBody>,
) {
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)))
    .limit(1)

  if (!existing) return null

  const patch: Partial<typeof transactions.$inferInsert> = {}
  if (body.type !== undefined) patch.type = body.type
  if (body.amount !== undefined) patch.amountCents = Math.round(body.amount * 100)
  if (body.description !== undefined) patch.description = body.description
  if (body.category !== undefined) patch.category = body.category
  if (body.date !== undefined) patch.date = body.date
  if (body.status !== undefined) patch.status = body.status
  if (body.walletId !== undefined) patch.walletId = body.walletId
  if (body.projectId !== undefined) patch.projectId = body.projectId
  if (body.reference !== undefined) patch.reference = body.reference
  if (body.notes !== undefined) patch.notes = body.notes
  if (body.currency !== undefined) patch.currency = body.currency
  if (body.reviewedAt !== undefined) patch.reviewedAt = body.reviewedAt ? new Date(body.reviewedAt) : null
  if (body.isRecurring !== undefined) patch.isRecurring = body.isRecurring
  if (body.recurringInterval !== undefined) patch.recurringInterval = body.recurringInterval
  if (existing.source === 'ai_receipt' && !existing.reviewedAt && Object.keys(patch).length > 0) {
    patch.reviewedAt = new Date()
  }
  patch.updatedAt = new Date()

  const [updated] = await db
    .update(transactions)
    .set(patch)
    .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)))
    .returning()

  if (!updated) return null

  const scope = await activityScopeForProject(userId, updated.projectId)
  const changedKeys = Object.keys(patch).filter((k) => k !== 'updatedAt')
  const activity = buildPatchActivity(changedKeys, patch, existing, {
    statusActions: {
      paid: { action: 'paid', summaryKey: 'activity:transaction.paid', summaryParams: { description: updated.description } },
    },
    fallbackSummaryKey: () => ({ summaryKey: 'activity:transaction.updated', summaryParams: { description: updated.description } }),
  })

  if (activity) {
    logActivity({
      userId,
      entityType: 'transaction',
      entityId: txId,
      action: activity.action,
      summaryKey: activity.summaryKey,
      summaryParams: activity.summaryParams,
      projectId: scope.projectId,
      contactId: scope.contactId,
      metadata: activity.metadata,
    })
  }

  const justPaid =
    body.status !== undefined &&
    existing.status !== updated.status &&
    (updated.status === 'paid' || updated.status === 'received')
  if (justPaid) {
    const invoicePayment = updated.type === 'revenue' && !!(body.documentId ?? existing.documentId)
    await createNotification({
      userId,
      title: updated.type === 'revenue' ? 'Payment received' : 'Payment marked paid',
      body: `${updated.description} — $${(updated.amountCents / 100).toFixed(2)}`,
      key: updated.type === 'revenue' ? 'paymentReceived' : 'paymentPaid',
      params: { description: updated.description, amount: (updated.amountCents / 100).toFixed(2) },
      link: `/accounting/transactions?txId=${encodeURIComponent(updated.id)}`,
      ...(invoicePayment ? { event: 'invoicePaymentReceived' as const } : {}),
    })
  }

  if (updated.type === 'expense' && updated.category) {
    await checkBudgetThreshold(userId, updated.category, updated.amountCents)
  }

  let warning: string | undefined
  const documentChanged = body.documentId !== undefined && body.documentId !== existing.documentId
  if (documentChanged || existing.documentId) {
    const desired = documentChanged
      ? { ...updated, documentId: body.documentId ?? null }
      : updated
    const resync = await resyncReconciliation(userId, existing, desired)
    warning = resync.warning

    if (documentChanged) {
      const [refetched] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)))
      return { ...toTx(refetched), warning }
    }
  }

  return { ...toTx(updated), warning }
}

export async function importReceiptTransaction(userId: string, file: File) {
  const baseCurrency = await getUserBaseCurrency(userId)
  const draft = await extractReceiptTransaction(userId, file, baseCurrency)
  const stored = await uploadFile(userId, file, { kind: 'image' })
  const flags = draft.flags
  const transaction = await createTransaction(userId, {
    ...draft,
    status: draft.type === 'revenue' ? 'received' : 'paid',
    source: 'ai_receipt',
    aiFlags: flags,
    reviewedAt: flags.length === 0 ? new Date() : null,
  })

  await db.insert(fileLinks).values({
    fileId: stored.id,
    entityType: 'transaction',
    entityId: transaction.id,
  })

  if (flags.length > 0) {
    const reasons = flags.map((f) => RECEIPT_FLAG_MESSAGE[f]).join('; ')
    await createNotification({
      userId,
      title: 'Receipt import needs review',
      body: `${transaction.description} — $${transaction.amount.toFixed(2)} was imported from a receipt: ${reasons}.`,
      key: 'receiptReview',
      // web resolves each flag via notifications.flags.<flag>
      params: { description: transaction.description, amount: transaction.amount.toFixed(2), flags: flags.join(',') },
      link: `/accounting/transactions?txId=${encodeURIComponent(transaction.id)}`,
      event: 'receiptReview',
    })
  }

  return { transaction, file: stored }
}

/** Delete a transaction */
export async function deleteTransaction(userId: string, txId: string): Promise<boolean> {
  const [existing] = await db
    .select({ projectId: transactions.projectId, description: transactions.description })
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)))
    .limit(1)

  if (!existing) return false

  await db.delete(transactions).where(
    and(eq(transactions.id, txId), eq(transactions.userId, userId)),
  )

  const scope = await activityScopeForProject(userId, existing.projectId)
  logActivity({
    userId,
    entityType: 'transaction',
    entityId: txId,
    action: 'deleted',
    summaryKey: 'activity:transaction.deleted',
    summaryParams: { description: existing.description },
    projectId: scope.projectId,
    contactId: scope.contactId,
  })
  return true
}

export async function bulkDeleteTransactions(userId: string, ids: string[]): Promise<{ deleted: number }> {
  if (ids.length === 0) return { deleted: 0 }
  const result = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)))
    .returning({ id: transactions.id })
  return { deleted: result.length }
}

/** Accepts AI-imported drafts as-is; omit `ids` to accept every pending one. Always scoped to
 *  unreviewed ai_receipt rows, so a stale id list can never stamp a manual transaction. */
export async function bulkReviewTransactions(userId: string, ids?: string[]): Promise<{ reviewed: number }> {
  if (ids?.length === 0) return { reviewed: 0 }
  const result = await db
    .update(transactions)
    .set({ reviewedAt: new Date() })
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.source, 'ai_receipt'),
        isNull(transactions.reviewedAt),
        ...(ids ? [inArray(transactions.id, ids)] : []),
      ),
    )
    .returning({ id: transactions.id })
  return { reviewed: result.length }
}

export async function getMonthlyBreakdown(userId: string) {
  const rows = await db.select().from(transactions).where(eq(transactions.userId, userId))
  const agg = await aggregateWithConverter(userId, rows)
  return Array.from(agg.byMonth.entries())
    .map(([month, bucket]) => ({
      month,
      revenue: bucket.revenue / 100,
      expenses: bucket.expenses / 100,
      net: (bucket.revenue - bucket.expenses) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export async function getTransactionsByCategory(userId: string) {
  const rows = await db.select().from(transactions).where(eq(transactions.userId, userId))
  const { amounts, baseCurrency, conversionIncomplete } = await convertTransactionAmounts(userId, rows)
  const map = new Map<string, { totalRevenueCents: number; totalExpensesCents: number }>()

  for (const r of rows) {
    const amount = amounts.get(r.id)
    if (amount == null) continue
    const key = r.category ?? 'Uncategorized'
    if (!map.has(key)) map.set(key, { totalRevenueCents: 0, totalExpensesCents: 0 })
    const entry = map.get(key)!
    if (r.type === 'revenue') entry.totalRevenueCents += amount
    else entry.totalExpensesCents += amount
  }

  return Array.from(map.entries())
    .map(([category, { totalRevenueCents, totalExpensesCents }]) => ({
      category,
      totalRevenue: totalRevenueCents / 100,
      totalExpenses: totalExpensesCents / 100,
      net: (totalRevenueCents - totalExpensesCents) / 100,
      currency: baseCurrency,
      conversionIncomplete,
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
}

export async function getRevenueByProject(userId: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'revenue')))

  const userProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.userId, userId))

  const projectNameMap = new Map(userProjects.map((p) => [p.id, p.name]))
  const { amounts, baseCurrency, conversionIncomplete } = await convertTransactionAmounts(userId, rows)
  const map = new Map<string, number>()
  for (const r of rows) {
    const amount = amounts.get(r.id)
    if (amount == null) continue
    const key = r.projectId ?? 'unassigned'
    map.set(key, (map.get(key) ?? 0) + amount)
  }

  return Array.from(map.entries())
    .map(([projectId, totalCents]) => ({
      projectId: projectId === 'unassigned' ? null : projectId,
      projectName: projectId === 'unassigned' ? 'Unassigned' : (projectNameMap.get(projectId) ?? 'Unknown'),
      totalRevenue: totalCents / 100,
      currency: baseCurrency,
      conversionIncomplete,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

/**
 * Feeds the assistant's tax answers, so it has to agree with the accounting
 * overview: same brackets, same tax year, and net rather than gross. The old
 * version taxed all-time gross revenue at a flat 25% and summed mixed
 * currencies as if they were one.
 */
export async function getTaxEstimate(userId: string) {
  const year = new Date().getFullYear()
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, `${year}-01-01`),
        lte(transactions.date, `${year}-12-31`),
      ),
    )

  const { convert, conversionIncomplete } = await buildConverterForBase(
    'THB',
    rows.map((r) => ({ currency: r.currency ?? 'USD', date: r.date })),
  )

  let revenueSatang = 0
  let expensesSatang = 0
  for (const row of rows) {
    const converted = convert(row.amountCents, row.currency ?? 'USD', row.date)
    if (converted == null) continue
    if (row.type === 'revenue') revenueSatang += converted
    else expensesSatang += converted
  }

  const netSatang = revenueSatang - expensesSatang
  const taxSatang = estimateThaiIncomeTax(netSatang)

  return {
    taxYear: year,
    // Handed over rather than left as CE + 543 for the model to work out: asked
    // for a tax year it answered with a พ.ศ. three years off while getting the
    // filing deadlines in the same reply right.
    taxYearBE: year + 543,
    filingDeadline: `31 March ${year + 1} (พ.ศ. ${year + 544}) for ภ.ง.ด.90`,
    currency: 'THB',
    totalRevenue: revenueSatang / 100,
    totalExpenses: expensesSatang / 100,
    netIncome: netSatang / 100,
    estimatedTax: taxSatang / 100,
    netAfterTax: (netSatang - taxSatang) / 100,
    conversionIncomplete,
    basis:
      'Progressive Thai personal income tax on net income, after the THB 60,000 personal allowance. Actual logged expenses only: the standard 60% deduction and every other allowance are not applied, so the real liability is usually lower. Not a filing figure.',
  }
}

export async function getProfitByMonth(userId: string) {
  const breakdown = await getMonthlyBreakdown(userId)
  let cumulativeNet = 0
  return breakdown.map((entry) => {
    cumulativeNet = Math.round((cumulativeNet + entry.net) * 100) / 100
    return { ...entry, cumulativeNet }
  })
}

export async function markTransactionPaid(userId: string, transactionId: string) {
  const result = await patchTransaction(userId, transactionId, { status: 'paid' })
  return result ?? { updated: false }
}

export async function getTransactionsByProject(userId: string, projectId: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.projectId, projectId)))
    .orderBy(desc(transactions.date))
  return rows.map(toTx)
}

export async function getProjectProfitability(userId: string, projectId: string) {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  if (!project) return { found: false, message: 'Project not found' }

  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.projectId, projectId)))

  const { amounts, baseCurrency, conversionIncomplete } = await convertTransactionAmounts(userId, rows)
  let revenueCents = 0
  let expensesCents = 0
  for (const row of rows) {
    const amount = amounts.get(row.id)
    if (amount == null) continue
    if (row.type === 'revenue') revenueCents += amount
    else expensesCents += amount
  }

  return {
    projectId: project.id,
    projectName: project.name,
    revenue: revenueCents / 100,
    expenses: expensesCents / 100,
    net: (revenueCents - expensesCents) / 100,
    currency: baseCurrency,
    conversionIncomplete,
  }
}

export async function getExpenseByWallet(userId: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')))

  const userWallets = await db
    .select({ id: wallets.id, name: wallets.name })
    .from(wallets)
    .where(eq(wallets.userId, userId))

  const walletNameMap = new Map(userWallets.map((w) => [w.id, w]))
  const { amounts, baseCurrency, conversionIncomplete } = await convertTransactionAmounts(userId, rows)

  const map = new Map<string, { totalCents: number; walletName: string }>()
  for (const r of rows) {
    const amount = amounts.get(r.id)
    if (amount == null) continue
    const key = r.walletId ?? 'unassigned'
    if (!map.has(key)) {
      const wallet = walletNameMap.get(key)
      map.set(key, {
        totalCents: 0,
        walletName: wallet?.name ?? 'Unassigned',
      })
    }
    map.get(key)!.totalCents += amount
  }

  return Array.from(map.entries())
    .map(([walletId, { totalCents, walletName }]) => ({
      walletId: walletId === 'unassigned' ? null : walletId,
      walletName,
      totalExpenses: totalCents / 100,
      currency: baseCurrency,
      conversionIncomplete,
    }))
    .sort((a, b) => b.totalExpenses - a.totalExpenses)
}
