import type { SortingState } from '@tanstack/react-table'
import type { Document, DocumentType } from '@/components/documents/types'
import { DOCUMENT_TYPE_ORDER } from '@/components/documents/constants'

function compareCalendarDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return b.localeCompare(a)
}

const STATUS_SORT_ORDER: Record<Document['status'], number> = {
  draft: 0,
  published: 1,
  overdue: 2,
  archived: 3,
}

/** Ascending comparison for a single sortable column. Nullish values sort last. */
function compareBySortId(a: Document, b: Document, id: string): number {
  switch (id) {
    case 'document':
      return a.number.localeCompare(b.number, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    case 'project':
      return (a.projectName ?? '').localeCompare(b.projectName ?? '', undefined, {
        sensitivity: 'base',
      })
    case 'issueDate':
      return (a.issueDate ?? '').localeCompare(b.issueDate ?? '')
    case 'dueDate':
      return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
    case 'clientName':
      return (a.clientName ?? '').localeCompare(b.clientName ?? '', undefined, {
        sensitivity: 'base',
      })
    case 'total':
      return a.totalCents - b.totalCents
    case 'status':
      return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]
    case 'updatedAt':
      return a.updatedAt.localeCompare(b.updatedAt)
    default:
      return 0
  }
}

/** Reorder a single type group using the user's sort, falling back to the default ordering. */
function applySortingToTypeGroup(docs: Document[], sorting: SortingState): Document[] {
  if (sorting.length === 0) return sortDocumentsInTypeGroup(docs)

  return [...docs].sort((a, b) => {
    for (const sort of sorting) {
      const cmp = compareBySortId(a, b, sort.id)
      if (cmp !== 0) return sort.desc ? -cmp : cmp
    }
    return 0
  })
}

export function sortDocumentsByIssueDate<T extends Pick<Document, 'issueDate' | 'updatedAt'>>(documents: T[]): T[] {
  return [...documents].sort((a, b) => {
    const byIssue = compareCalendarDateDesc(a.issueDate, b.issueDate)
    if (byIssue !== 0) return byIssue
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function sortDocumentsForFlatView(documents: Document[], sorting: SortingState): Document[] {
  return sorting.length === 0 ? sortDocumentsByIssueDate(documents) : applySortingToTypeGroup(documents, sorting)
}

export function isDocumentDraft(doc: Document): boolean {
  return doc.status === 'draft' && doc.deletedAt == null
}

export function isDocumentArchived(doc: Document): boolean {
  return doc.deletedAt != null
}

/** Published by issue date desc, then drafts by updatedAt desc, then archived. */
export function sortDocumentsInTypeGroup(docs: Document[]): Document[] {
  const published = docs.filter((d) => !isDocumentDraft(d) && !isDocumentArchived(d))
  const drafts = docs.filter(isDocumentDraft)
  const archived = docs.filter(isDocumentArchived)

  published.sort((a, b) => {
    const byIssue = compareCalendarDateDesc(a.issueDate, b.issueDate)
    if (byIssue !== 0) return byIssue
    return b.updatedAt.localeCompare(a.updatedAt)
  })
  drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  archived.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return [...published, ...drafts, ...archived]
}

export function groupDocumentsByType(
  documents: Document[],
  sorting: SortingState = [],
  typeOrder: readonly DocumentType[] = DOCUMENT_TYPE_ORDER,
): { type: DocumentType; documents: Document[] }[] {
  const buckets = new Map<DocumentType, Document[]>()
  for (const type of typeOrder) {
    buckets.set(type, [])
  }
  for (const doc of documents) {
    buckets.get(doc.type)?.push(doc)
  }
  return typeOrder
    .map((type) => ({
      type,
      documents: applySortingToTypeGroup(buckets.get(type) ?? [], sorting),
    }))
    .filter((g) => g.documents.length > 0)
}
