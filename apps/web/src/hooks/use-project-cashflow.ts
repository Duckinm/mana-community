import { useQuery } from '@tanstack/react-query'
import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import type { CashflowChartPoint } from '@/components/projects/project-billing-helpers'

export function useProjectCashflow(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectCashflow(projectId ?? ''),
    queryFn: async (): Promise<CashflowChartPoint[]> =>
      expectEden(await client.api.projects({ id: projectId! }).cashflow.get()),
    enabled: !!projectId,
  })
}
