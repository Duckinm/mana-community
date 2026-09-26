import { describe, expect, it } from 'vitest'
import { L } from '@/components/documents/preview/preview-labels'

describe('document preview labels', () => {
  it('uses the document language independently of the app locale', () => {
    expect(L('issued', 'th')).toBe('วันที่ออก')
    expect(L('unitPrice', 'th')).toBe('ราคาต่อหน่วย')
    expect(L('paymentDetails', 'th')).toBe('ข้อมูลการชำระเงิน')
    expect(L('issued', 'en')).toBe('ISSUED')
  })
})
