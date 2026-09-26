import type { Document } from '@/components/documents/types'
import { documentDisplayStatus } from '@/lib/document-helpers'

/** UI-only: derive display status from wire document fields. */
export function applyDocumentDisplayStatus(doc: unknown): Document {
  const wire = doc as {
    status: string
    dueDate?: string | null
    paidAt?: string | null
  }
  return { ...(doc as object), status: documentDisplayStatus(wire) } as Document
}

export function applyDocumentDisplayStatusList(docs: unknown[]): Document[] {
  return docs.map(applyDocumentDisplayStatus)
}
