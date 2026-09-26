import { describe, expect, it } from 'bun:test'
import { missingTaxInvoiceFields } from '@api/modules/documents/publication'

const complete = {
  type: 'INV',
  vatRegistered: true,
  registeredName: 'สตูดิโอ นันท์ จำกัด',
  registeredAddress: '123 ถนนสุขุมวิท กรุงเทพฯ 10110',
  yourTaxId: '0105558123456',
  clientName: 'บริษัท ลูกค้า จำกัด',
}

describe('missingTaxInvoiceFields', () => {
  it('passes a complete VAT-registered invoice', () => {
    expect(missingTaxInvoiceFields(complete)).toEqual([])
  })

  it('blocks the reported defect — a tax invoice with no tax ID', () => {
    expect(missingTaxInvoiceFields({ ...complete, yourTaxId: null })).toEqual(['yourTaxId'])
  })

  it('rejects a tax ID that is not 13 digits', () => {
    expect(missingTaxInvoiceFields({ ...complete, yourTaxId: '12345' })).toEqual(['yourTaxId'])
  })

  it('accepts a formatted 13-digit tax ID', () => {
    expect(missingTaxInvoiceFields({ ...complete, yourTaxId: '0-1055-58123-45-6' })).toEqual([])
  })

  it('treats whitespace-only identity fields as missing', () => {
    expect(missingTaxInvoiceFields({ ...complete, registeredName: '   ' })).toEqual([
      'registeredName',
    ])
  })

  it('reports every missing field at once', () => {
    expect(
      missingTaxInvoiceFields({
        ...complete,
        registeredName: null,
        registeredAddress: null,
        yourTaxId: null,
        clientName: null,
      }),
    ).toEqual(['registeredName', 'registeredAddress', 'yourTaxId', 'clientName'])
  })

  it('leaves non-VAT invoices alone', () => {
    expect(missingTaxInvoiceFields({ ...complete, vatRegistered: false, yourTaxId: null })).toEqual(
      [],
    )
  })

  it('leaves quotations and receipts alone — only an INV is a ใบกำกับภาษี', () => {
    for (const type of ['QO', 'RC']) {
      expect(missingTaxInvoiceFields({ ...complete, type, yourTaxId: null })).toEqual([])
    }
  })
})
