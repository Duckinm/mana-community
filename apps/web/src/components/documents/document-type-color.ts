import type { DocumentType } from '@/components/documents/types'

// The document number already spells out the type (QO-/INV-/RC-), so the type
// reads from the number's colour instead of a separate badge.
export const DOCUMENT_TYPE_COLOR: Record<DocumentType, string> = {
  QO: 'var(--warning)',
  INV: 'var(--primary)',
  RC: 'var(--category-green)',
}
