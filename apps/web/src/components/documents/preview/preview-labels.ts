import i18next from '@/lib/i18n'

export type PreviewLang = 'th' | 'en'

const PREVIEW_KEYS = {
  invoice: 'preview.invoice',
  quotation: 'preview.quotation',
  receipt: 'preview.receipt',
  issued: 'preview.issued',
  due: 'preview.due',
  from: 'preview.from',
  to: 'preview.to',
  description: 'preview.description',
  qty: 'preview.qty',
  unitPrice: 'preview.unitPrice',
  amount: 'preview.amount',
  noLineItems: 'preview.noLineItems',
  subtotal: 'preview.subtotal',
  discount: 'preview.discount',
  tax: 'preview.tax',
  wht: 'preview.wht',
  total: 'preview.total',
  amountDue: 'preview.amountDue',
  paymentDetails: 'preview.paymentDetails',
  bank: 'preview.bank',
  account: 'preview.account',
  accountNo: 'preview.accountNo',
  promptPay: 'preview.promptPay',
  scanToPay: 'preview.scanToPay',
  swift: 'preview.swift',
  cardNumber: 'preview.cardNumber',
  cardExpiry: 'preview.cardExpiry',
  cardholderName: 'preview.cardholderName',
  companyNameEn: 'preview.companyNameEn',
  companyNameTh: 'preview.companyNameTh',
  fullName: 'preview.fullName',
  taxId: 'preview.taxId',
  nationalId: 'preview.nationalId',
  email: 'preview.email',
  phone: 'preview.phone',
  address: 'preview.address',
  registeredAddress: 'preview.registeredAddress',
  addressTh: 'preview.addressTh',
  branch: 'preview.branch',
  branchLabel: 'preview.branchLabel',
  remark: 'preview.remark',
  zip: 'preview.zip',
  country: 'preview.country',
  poweredBy: 'preview.poweredBy',
} as const

/**
 * Document preview text follows the document's own language toggle
 * (PreviewLang), not the app's UI locale — so this always resolves via a
 * fixed translator pinned to `lang`, independent of i18next.language.
 */
export function L(
  key: keyof typeof PREVIEW_KEYS,
  lang: PreviewLang,
  opts?: Record<string, unknown>,
): string {
  return i18next.getFixedT(lang, 'documents')(PREVIEW_KEYS[key], opts)
}
