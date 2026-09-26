import { describe, it, expect } from 'bun:test'
import { buildTransactionConditions, toTx } from '@api/modules/finance/service'
import { financeHandlers } from '@api/utils/mcp-tools/finance'

describe('buildTransactionConditions', () => {
  it('includes only the userId condition when no filters are given', () => {
    const conditions = buildTransactionConditions('user-1', {})
    expect(conditions.length).toBe(1)
  })

  it('adds a condition per filter supplied', () => {
    const conditions = buildTransactionConditions('user-1', {
      type: 'revenue',
      status: 'paid',
      walletId: 'wallet-1',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    })
    expect(conditions.length).toBe(6)
  })

  it('ignores type and status when set to "all"', () => {
    const conditions = buildTransactionConditions('user-1', { type: 'all', status: 'all' })
    expect(conditions.length).toBe(1)
  })

  it('adds an unlinked condition when unlinked is true', () => {
    const conditions = buildTransactionConditions('user-1', { unlinked: true })
    expect(conditions.length).toBe(2)
  })

  it('adds a search condition when q is non-blank', () => {
    const conditions = buildTransactionConditions('user-1', { q: 'invoice' })
    expect(conditions.length).toBe(2)
  })

  it('ignores a blank or whitespace-only q', () => {
    const conditions = buildTransactionConditions('user-1', { q: '   ' })
    expect(conditions.length).toBe(1)
  })
})

describe('toTx', () => {
  const baseRow = {
    id: 'tx-1',
    userId: 'user-1',
    type: 'expense',
    amountCents: 12345,
    description: 'Coffee',
    category: 'meals',
    date: '2026-06-01',
    status: 'pending',
    walletId: null,
    projectId: null,
    reference: null,
    notes: null,
    currency: null,
    source: 'manual',
    reviewedAt: null,
    isRecurring: false,
    recurringInterval: null,
    documentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Parameters<typeof toTx>[0]

  it('converts amountCents to a dollar amount', () => {
    expect(toTx(baseRow).amount).toBe(123.45)
  })

  it('defaults currency to USD when null', () => {
    expect(toTx(baseRow).currency).toBe('USD')
  })

  it('maps nullable fields to undefined', () => {
    const dto = toTx(baseRow)
    expect(dto.walletId).toBeNull()
    expect(dto.projectId).toBeUndefined()
    expect(dto.reference).toBeUndefined()
    expect(dto.notes).toBeUndefined()
    expect(dto.recurringInterval).toBeUndefined()
    expect(dto.documentId).toBeUndefined()
  })

  it('passes through populated optional fields', () => {
    const dto = toTx({ ...baseRow, walletId: 'wallet-1', currency: 'EUR', reference: 'INV-1' })
    expect(dto.walletId).toBe('wallet-1')
    expect(dto.currency).toBe('EUR')
    expect(dto.reference).toBe('INV-1')
  })

  it('marks AI receipt transactions for review', () => {
    const reviewedAt = new Date('2026-07-02T00:00:00.000Z')
    const dto = toTx({ ...baseRow, source: 'ai_receipt', reviewedAt })
    expect(dto.source).toBe('ai_receipt')
    expect(dto.reviewedAt).toBe(reviewedAt.toISOString())
  })
})

describe('finance MCP tools', () => {
  it('requires an attached or base64 receipt image for receipt import', async () => {
    await expect(financeHandlers['import_receipt_transaction']('user-1', {})).rejects.toThrow(
      'import_receipt_transaction requires an attached image fileName or fileBase64 and mediaType',
    )
  })
})
