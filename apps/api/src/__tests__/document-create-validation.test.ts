import { describe, expect, it } from 'bun:test'
import { validateDocumentAmounts, validateDocumentCreate } from '@mana/db/document-create-validation'

describe('document creation rules', () => {
  it('requires the same sender, client, billable item, and project details as the document workflow', () => {
    expect(validateDocumentCreate({
      type: 'INV',
      items: [],
    })).toEqual([
      'sender-required',
      'client-name-required',
      'client-phone-required',
      'item-required',
      'project-required',
    ])
  })

  it('allows a sender profile and a contact to satisfy the required party details', () => {
    expect(validateDocumentCreate({
      type: 'QO',
      senderProfileId: 'sender-1',
      clientName: 'Acme Co.',
      clientPhone: '+66 81 234 5678',
      items: [{ description: 'Strategy workshop', quantity: 1, unitPriceCents: 150000 }],
    })).toEqual([])
  })

  it('keeps the wizard’s line-item and date constraints together', () => {
    expect(validateDocumentCreate({
      type: 'QO',
      registeredName: 'Patiparn',
      clientName: 'Acme Co.',
      clientPhone: '+66 81 234 5678',
      issueDate: '2026-08-05',
      dueDate: '2026-08-04',
      items: [{ description: 'Strategy workshop', quantity: 0, unitPriceCents: 0 }],
    })).toEqual([
      'item-quantity-required',
      'item-amount-required',
      'due-before-issue',
    ])
  })

  it('rejects a fractional line-item quantity', () => {
    expect(validateDocumentAmounts({ items: [{ quantity: 2.5, unitPriceCents: 1000 }] }))
      .toEqual(['item-quantity-fractional'])
    expect(validateDocumentAmounts({ items: [{ quantity: 2, unitPriceCents: 1000 }] })).toEqual([])
  })

  it('rejects negative money and out-of-range rates', () => {
    expect(validateDocumentAmounts({
      discountCents: -1,
      taxRateBps: 10_001,
      items: [{ quantity: 100, unitPriceCents: -500 }],
    })).toEqual([
      'item-amount-negative',
      'discount-negative',
      'rate-out-of-range',
    ])
  })

  it('leaves a partial edit alone when its amounts are absent or valid', () => {
    expect(validateDocumentAmounts({ dueDate: '2026-08-06' })).toEqual([])
    expect(validateDocumentAmounts({
      issueDate: '2026-08-05',
      dueDate: '2026-08-05',
      discountCents: 0,
      taxRateBps: 700,
      whtRateBps: 10_000,
      items: [{ quantity: 250, unitPriceCents: 0 }],
    })).toEqual([])
  })
})
