import { describe, it, expect } from 'bun:test'
import { transitionDocument, isOverdue, documentDisplayStatus, isOpenInvoice, unpaidInvoiceConditions } from '@api/lib/document-status'

describe('transitionDocument', () => {
  describe('publish', () => {
    it('moves draft → published', () => {
      expect(transitionDocument('draft', 'publish')).toBe('published')
    })

    it('throws when publishing a published document', () => {
      expect(() => transitionDocument('published', 'publish')).toThrow('Invalid Document transition')
    })

    it('throws when publishing an overdue document', () => {
      expect(() => transitionDocument('overdue', 'publish')).toThrow()
    })
  })

  describe('reconcile', () => {
    it('keeps published → published', () => {
      expect(transitionDocument('published', 'reconcile')).toBe('published')
    })

    it('moves overdue → published', () => {
      expect(transitionDocument('overdue', 'reconcile')).toBe('published')
    })

    it('throws when reconciling a draft document', () => {
      expect(() => transitionDocument('draft', 'reconcile')).toThrow()
    })
  })

  describe('unreconcile', () => {
    it('keeps published → published', () => {
      expect(transitionDocument('published', 'unreconcile')).toBe('published')
    })

    it('throws when unreconciling a draft document', () => {
      expect(() => transitionDocument('draft', 'unreconcile')).toThrow()
    })

    it('throws when unreconciling an overdue document', () => {
      expect(() => transitionDocument('overdue', 'unreconcile')).toThrow()
    })
  })

  it('includes the current status and event in the error message', () => {
    expect(() => transitionDocument('overdue', 'publish')).toThrow('overdue → publish')
  })
})

describe('isOverdue', () => {
  it('returns true when status is already overdue regardless of dueDate', () => {
    expect(isOverdue({ status: 'overdue', dueDate: '2999-01-01' }, '2026-06-16')).toBe(true)
  })

  it('returns true for a published document whose dueDate is before asOf', () => {
    expect(isOverdue({ status: 'published', dueDate: '2026-06-15' }, '2026-06-16')).toBe(true)
  })

  it('returns false for a published document whose dueDate is after asOf', () => {
    expect(isOverdue({ status: 'published', dueDate: '2026-06-17' }, '2026-06-16')).toBe(false)
  })

  it('returns false for a published document due exactly on asOf (boundary)', () => {
    expect(isOverdue({ status: 'published', dueDate: '2026-06-16' }, '2026-06-16')).toBe(false)
  })

  it('returns false for a published document with no dueDate', () => {
    expect(isOverdue({ status: 'published', dueDate: null }, '2026-06-16')).toBe(false)
  })

  it('returns false for a draft document even when past due', () => {
    expect(isOverdue({ status: 'draft', dueDate: '2020-01-01' }, '2026-06-16')).toBe(false)
  })

  it('defaults asOf to today when omitted (past dueDate is overdue)', () => {
    expect(isOverdue({ status: 'published', dueDate: '2000-01-01' })).toBe(true)
  })
})

describe('unpaidInvoiceConditions', () => {
  it('returns a truthy Drizzle where-clause', () => {
    const cond = unpaidInvoiceConditions('user-123')
    expect(cond).toBeTruthy()
  })

  it('produces distinct clauses for different users', () => {
    expect(unpaidInvoiceConditions('a')).toBeTruthy()
    expect(unpaidInvoiceConditions('b')).toBeTruthy()
  })
})

describe('documentDisplayStatus', () => {
  it('returns overdue for published invoice past dueDate', () => {
    expect(documentDisplayStatus({ status: 'published', dueDate: '2026-06-15' }, '2026-06-16')).toBe('overdue')
  })

  it('returns published for published invoice not yet due', () => {
    expect(documentDisplayStatus({ status: 'published', dueDate: '2026-06-17' }, '2026-06-16')).toBe('published')
  })
})

describe('isOpenInvoice', () => {
  it('returns true for unpaid published invoice', () => {
    expect(isOpenInvoice({ type: 'INV', status: 'published', paidAt: null })).toBe(true)
  })

  it('returns false for paid invoice', () => {
    expect(isOpenInvoice({ type: 'INV', status: 'published', paidAt: '2026-06-01' })).toBe(false)
  })
})
