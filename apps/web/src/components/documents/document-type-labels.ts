import type { DocumentType } from '@/components/documents/types'

const TYPE_KEY: Record<DocumentType, 'quotation' | 'invoice' | 'receipt'> = {
  QO: 'quotation',
  INV: 'invoice',
  RC: 'receipt',
}

export type DocumentTypeLabelField =
  | 'termsTitle'
  | 'numberLabel'
  | 'lineItemsTitle'
  | 'formStepTerms'

export function documentTypeLabelKey(
  type: DocumentType,
  field: DocumentTypeLabelField,
): `documentTypeLabels.${typeof TYPE_KEY[DocumentType]}.${DocumentTypeLabelField}` {
  return `documentTypeLabels.${TYPE_KEY[type]}.${field}`
}
