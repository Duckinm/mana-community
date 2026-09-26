import type { documentItems, documents } from '@mana/db'

// Narrowed to the fields the XML actually needs, so scripts and tests can hand it a
// literal instead of a whole 70-column document row.
type Document = Pick<
  typeof documents.$inferSelect,
  | 'number' | 'type' | 'issueDate' | 'remark' | 'currency'
  | 'registeredName' | 'registeredNameEn' | 'registeredAddress' | 'yourTaxId' | 'yourBranchNumber' | 'yourEmail'
  | 'clientName' | 'clientNameTh' | 'clientAddress' | 'clientAddressTh' | 'clientTaxId' | 'clientBranchNumber' | 'clientEmail'
  | 'subtotalCents' | 'discountCents' | 'taxRateBps' | 'taxCents' | 'totalCents' | 'amountDueCents'
>
type DocumentItem = Pick<
  typeof documentItems.$inferSelect,
  'description' | 'quantity' | 'unitPriceCents' | 'subtotalCents'
>

// ขมธอ. 3-2560 is UN/CEFACT CII with ETDA's Thai extensions. Document type codes come
// from ETDA's code list: 388 tax invoice, 380 invoice, T02 receipt, T03 debit note.
const TYPE_CODES: Record<string, string> = { INV: '388', RC: 'T02', QO: '380' }

function esc(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)
}

function money(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** CII wants `YYYYMMDD` (format 102); calendar dates are already `YYYY-MM-DD`. */
function ymd(date: string | null): string {
  return (date ?? '').replace(/-/g, '')
}

function tradeParty(tag: string, name: string, taxId: string | null, branch: string | null, address: string | null, email: string | null): string {
  return `<ram:${tag}>
      <ram:Name>${esc(name)}</ram:Name>
      ${address ? `<ram:PostalTradeAddress><ram:LineOne>${esc(address)}</ram:LineOne><ram:CountryID>TH</ram:CountryID></ram:PostalTradeAddress>` : ''}
      ${email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(email)}</ram:URIID></ram:URIUniversalCommunication>` : ''}
      ${taxId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="TXID">${esc(taxId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      ${branch ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="TXID_BRANCH">${esc(branch)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
    </ram:${tag}>`
}

function line(item: DocumentItem, index: number, currency: string): string {
  return `<ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${index + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${esc(item.description)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount currencyID="${currency}">${money(item.unitPriceCents)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="EA">${(item.quantity / 100).toFixed(2)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount currencyID="${currency}">${money(item.subtotalCents)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
}

/**
 * Build the ขมธอ. 3-2560 XML that PDF/A-3 carries as its associated file. Field coverage
 * is the mandatory core (parties, tax registration, lines, VAT, totals); ETDA's optional
 * extensions are left out until a real submission asks for them.
 */
export function buildEtaxXml(doc: Document, items: DocumentItem[]): string {
  const currency = doc.currency
  const sellerName = doc.registeredName ?? doc.registeredNameEn ?? ''
  const buyerName = doc.clientNameTh ?? doc.clientName ?? ''
  const taxRate = (doc.taxRateBps / 100).toFixed(2)

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:TaxInvoice_CrossIndustryInvoice xmlns:rsm="urn:etda:uncefact:data:standard:TaxInvoice_CrossIndustryInvoice:2" xmlns:ram="urn:etda:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:2" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:20">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>ETDA-Tax-Invoice-3-2560</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(doc.number)}</ram:ID>
    <ram:Name>${esc(sellerName)}</ram:Name>
    <ram:TypeCode>${TYPE_CODES[doc.type] ?? '388'}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${ymd(doc.issueDate)}</udt:DateTimeString></ram:IssueDateTime>
    ${doc.remark ? `<ram:IncludedNote><ram:Content>${esc(doc.remark)}</ram:Content></ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${items.map((item, i) => line(item, i, currency)).join('\n    ')}
    <ram:ApplicableHeaderTradeAgreement>
      ${tradeParty('SellerTradeParty', sellerName, doc.yourTaxId, doc.yourBranchNumber, doc.registeredAddress, doc.yourEmail)}
      ${tradeParty('BuyerTradeParty', buyerName, doc.clientTaxId, doc.clientBranchNumber, doc.clientAddressTh ?? doc.clientAddress, doc.clientEmail)}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${currency}</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount currencyID="${currency}">${money(doc.taxCents)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount currencyID="${currency}">${money(doc.subtotalCents - doc.discountCents)}</ram:BasisAmount>
        <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount currencyID="${currency}">${money(doc.subtotalCents)}</ram:LineTotalAmount>
        <ram:AllowanceTotalAmount currencyID="${currency}">${money(doc.discountCents)}</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount currencyID="${currency}">${money(doc.subtotalCents - doc.discountCents)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${currency}">${money(doc.taxCents)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount currencyID="${currency}">${money(doc.totalCents)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount currencyID="${currency}">${money(doc.amountDueCents)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:TaxInvoice_CrossIndustryInvoice>
`
}
