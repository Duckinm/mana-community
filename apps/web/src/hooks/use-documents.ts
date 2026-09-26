import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import { enrichWithProjectName } from '@/lib/selectors'
import { applyDocumentDisplayStatusList } from '@/lib/document-display-status'
import { useDocumentMutations } from '@/hooks/use-document-mutations'
import type { Document, DocumentType, DocumentStatus } from '@/components/documents/types'
import type { Project } from '@/components/projects/types'

export type DocumentFilters = {
  type?: DocumentType
  status?: DocumentStatus
  recurring?: boolean
  paid?: 'paid' | 'unpaid'
  search?: string
  from?: string
  to?: string
  sort?: 'issueDateDesc'
  page?: number
  limit?: number
  projectId?: string
}

export type DocumentsPage = {
  data: Document[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useDocumentsList(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.documentsList(filters as Record<string, unknown>),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = expectEden(
        await client.api.documents.get({
          query: {
            type: filters.type,
            status: filters.status,
            recurring: filters.recurring,
            paid: filters.paid,
            search: filters.search,
            from: filters.from,
            to: filters.to,
            sort: filters.sort,
            page: filters.page,
            limit: filters.limit,
            projectId: filters.projectId,
          },
        }),
      )
      return {
        ...result,
        data: applyDocumentDisplayStatusList(result.data),
      } satisfies DocumentsPage
    },
  })
}

export function useDocuments() {
  const queryClient = useQueryClient()

  const { data: documents = [], isPending: isLoading } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: async () => {
      const raw = expectEden(await client.api.documents.get())
      const docs = applyDocumentDisplayStatusList(raw.data)
      const projects = queryClient.getQueryData<Project[]>(queryKeys.projects) ?? []
      return enrichWithProjectName(docs, projects)
    },
  })

  const mutations = useDocumentMutations()

  return {
    documents,
    isLoading,
    ...mutations,
  }
}
