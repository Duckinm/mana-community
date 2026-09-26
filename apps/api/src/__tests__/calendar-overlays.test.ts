import { describe, expect, it } from 'bun:test'
import { documentOverlaysFromRow } from '@api/modules/calendar/service'

const range = {
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  asOf: '2026-07-03',
}

function documentRow(overrides: Partial<Parameters<typeof documentOverlaysFromRow>[0]>) {
  return {
    id: 'doc-1',
    type: 'INV',
    status: 'published',
    number: 'INV-2026-014',
    dueDate: null,
    validUntilDate: null,
    isRecurring: false,
    nextGenerationDate: null,
    projectId: 'project-1',
    deletedAt: null,
    ...overrides,
  }
}

describe('documentOverlaysFromRow', () => {
  it('marks a published invoice due yesterday as overdue', () => {
    const [overlay] = documentOverlaysFromRow(documentRow({ dueDate: '2026-07-02' }), range)

    expect(overlay.documentDateKind).toBe('invoiceDue')
    expect(overlay.urgency).toBe('overdue')
    expect(overlay.documentStatus).toBe('overdue')
    expect(overlay.title).toBe('INV-2026-014 due')
  })

  it('marks a published invoice due today through seven days out as due soon', () => {
    expect(documentOverlaysFromRow(documentRow({ dueDate: '2026-07-03' }), range)[0].urgency).toBe('dueSoon')
    expect(documentOverlaysFromRow(documentRow({ dueDate: '2026-07-10' }), range)[0].urgency).toBe('dueSoon')
  })

  it('marks a published invoice due after seven days as normal', () => {
    const [overlay] = documentOverlaysFromRow(documentRow({ dueDate: '2026-07-11' }), range)

    expect(overlay.urgency).toBe('normal')
  })

  it('marks an expired quotation separately from an overdue invoice', () => {
    const [overlay] = documentOverlaysFromRow(
      documentRow({
        type: 'QO',
        number: 'QO-2026-009',
        validUntilDate: '2026-07-02',
      }),
      range,
    )

    expect(overlay.documentDateKind).toBe('quoteExpiry')
    expect(overlay.urgency).toBe('expired')
    expect(overlay.documentStatus).toBe('published')
    expect(overlay.title).toBe('QO-2026-009 expires')
  })

  it('marks a quotation expiring within seven days as due soon', () => {
    const [overlay] = documentOverlaysFromRow(
      documentRow({ type: 'QO', validUntilDate: '2026-07-10' }),
      range,
    )

    expect(overlay.urgency).toBe('dueSoon')
  })

  it('adds recurring generation dates as normal urgency', () => {
    const [overlay] = documentOverlaysFromRow(
      documentRow({ isRecurring: true, nextGenerationDate: '2026-07-12' }),
      range,
    )

    expect(overlay.documentDateKind).toBe('recurringGeneration')
    expect(overlay.urgency).toBe('normal')
  })

  it('excludes receipts, drafts, archived, and deleted documents', () => {
    expect(documentOverlaysFromRow(documentRow({ type: 'RC', dueDate: '2026-07-04' }), range)).toEqual([])
    expect(documentOverlaysFromRow(documentRow({ status: 'draft', dueDate: '2026-07-04' }), range)).toEqual([])
    expect(documentOverlaysFromRow(documentRow({ status: 'archived', dueDate: '2026-07-04' }), range)).toEqual([])
    expect(documentOverlaysFromRow(documentRow({ deletedAt: new Date(), dueDate: '2026-07-04' }), range)).toEqual([])
  })
})
