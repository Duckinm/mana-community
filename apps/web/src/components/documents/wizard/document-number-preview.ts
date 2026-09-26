import type { Document, DocumentType } from '@/components/documents/types'

/**
 * Mirrors the server sequence (`TYPEYYMMNNN`, e.g. INV2607001, running number
 * continues across the year) to preview the number Publish will mint. The
 * server is authoritative; this is a best-effort display derived from the
 * current year's highest sequence for the type.
 */
export function previewNextDocumentNumber(
  documents: Document[],
  type: DocumentType,
  now = new Date(),
): string {
  const yy = String(now.getFullYear() % 100).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yearPattern = new RegExp(`^${type}${yy}\\d{2}(\\d{3})$`)
  let maxSeq = 0
  for (const doc of documents) {
    const seq = Number.parseInt(doc.number?.match(yearPattern)?.[1] ?? '', 10)
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq
  }
  return `${type}${yy}${mm}${String(maxSeq + 1).padStart(3, '0')}`
}
