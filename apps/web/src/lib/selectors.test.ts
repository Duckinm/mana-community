import { describe, expect, it } from 'vitest'
import { defaultRemarkTemplate } from '@/lib/selectors'

describe('defaultRemarkTemplate', () => {
  it('selects the default independently for each document type', () => {
    const quotation = { id: 'quotation', defaultFor: ['QO'] }
    const invoiceAndReceipt = { id: 'billing', defaultFor: ['INV', 'RC'] }
    const templates = [quotation, invoiceAndReceipt]

    expect(defaultRemarkTemplate(templates, 'QO')).toBe(quotation)
    expect(defaultRemarkTemplate(templates, 'INV')).toBe(invoiceAndReceipt)
    expect(defaultRemarkTemplate(templates, 'RC')).toBe(invoiceAndReceipt)
    expect(defaultRemarkTemplate(templates, 'UNKNOWN')).toBeNull()
  })
})
