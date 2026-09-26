import { describe, expect, it } from 'bun:test'
import { buildEtaxXml } from '@api/utils/pdf/etax-xml'

const DOC = {
  number: '101/2569',
  type: 'INV',
  issueDate: '2026-07-27',
  remark: null,
  currency: 'THB',
  registeredName: 'บริษัท ตัวอย่าง จำกัด',
  registeredNameEn: null,
  registeredAddress: '1 ถนนสุขุมวิท',
  yourTaxId: '0105500000000',
  yourBranchNumber: '00000',
  yourEmail: 'billing@example.co.th',
  clientName: 'Smith & Sons <Bangkok>',
  clientNameTh: null,
  clientAddress: '99 Rama IV Rd',
  clientAddressTh: null,
  clientTaxId: '0105500000001',
  clientBranchNumber: null,
  clientEmail: 'ap@client.co.th',
  subtotalCents: 1_000_000,
  discountCents: 50_000,
  taxRateBps: 700,
  taxCents: 66_500,
  totalCents: 1_016_500,
  amountDueCents: 1_016_500,
}

const ITEMS = [{ description: 'Design <work>', quantity: 250, unitPriceCents: 400_000, subtotalCents: 1_000_000 }]

describe('buildEtaxXml', () => {
  const xml = buildEtaxXml(DOC, ITEMS)

  it('formats amounts, quantities and dates the way CII expects', () => {
    expect(xml).toContain('<udt:DateTimeString format="102">20260727</udt:DateTimeString>')
    expect(xml).toContain('<ram:GrandTotalAmount currencyID="THB">10165.00</ram:GrandTotalAmount>')
    expect(xml).toContain('<ram:TaxBasisTotalAmount currencyID="THB">9500.00</ram:TaxBasisTotalAmount>')
    expect(xml).toContain('<ram:RateApplicablePercent>7.00</ram:RateApplicablePercent>')
    expect(xml).toContain('<ram:BilledQuantity unitCode="EA">2.50</ram:BilledQuantity>')
    expect(xml).toContain('<ram:TypeCode>388</ram:TypeCode>')
  })

  it('escapes text that would otherwise break the document', () => {
    expect(xml).toContain('Smith &#38; Sons &#60;Bangkok&#62;')
    expect(xml).toContain('Design &#60;work&#62;')
    expect(xml).not.toContain('<Bangkok>')
  })

  it('omits optional parties fields that are missing', () => {
    expect(xml).not.toContain('TXID_BRANCH">null')
    expect(xml).toContain('schemeID="TXID">0105500000001')
  })
})
