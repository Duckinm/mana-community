import { describe, expect, it } from 'vitest'
import { previewNextDocumentNumber } from '@/components/documents/wizard/document-number-preview'
import type { Document } from '@/components/documents/types'

const doc = (number: string) => ({ number }) as Document
const july2026 = new Date(2026, 6, 11)

describe('previewNextDocumentNumber', () => {
  it('formats TYPEYYMMNNN and continues the sequence across months of the year', () => {
    const docs = [doc('INV2607001'), doc('INV2606012'), doc('QO2607009')]
    expect(previewNextDocumentNumber(docs, 'INV', july2026)).toBe('INV2607013')
  })

  it('ignores other years and old-format numbers', () => {
    const docs = [doc('INV2512007'), doc('INV-2026-020')]
    expect(previewNextDocumentNumber(docs, 'INV', july2026)).toBe('INV2607001')
  })
})
