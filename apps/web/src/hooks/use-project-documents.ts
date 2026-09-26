import { useQuery } from '@tanstack/react-query'
import { client, expectEden } from '@/lib/eden'
import { applyDocumentDisplayStatusList } from '@/lib/document-display-status'
import { queryKeys } from '@/lib/query-keys'

export function useProjectDocuments(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectDocuments(projectId ?? ''),
    queryFn: async () => {
      const raw = expectEden(
        await client.api.documents.get({ query: { projectId: projectId!, limit: 100 } }),
      )
      return applyDocumentDisplayStatusList(raw.data)
    },
    enabled: !!projectId,
  })
}
