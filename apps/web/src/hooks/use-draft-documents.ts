import { useDocumentsList } from '@/hooks/use-documents'
import type { Document } from '@/components/documents/types'

export function useDraftDocuments(): { drafts: Document[]; isLoading: boolean } {
  const { data, isPending } = useDocumentsList({ status: 'draft', limit: 100 })

  const drafts = data?.data ?? []

  const sorted = [...drafts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return { drafts: sorted, isLoading: isPending }
}
