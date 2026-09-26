import { useMutation } from '@tanstack/react-query'
import { client, expectEden } from '@/lib/eden'

export interface FinanceNarrative {
  headline: string
  narrative: string
  insights: string[]
}

export function useFinanceNarrative() {
  const mutation = useMutation({
    mutationFn: async () => expectEden(await client.api.ai['finance-narrative'].get()),
  })

  return {
    data: mutation.data ?? null,
    loading: mutation.isPending,
    error: mutation.error ? (mutation.error instanceof Error ? mutation.error.message : 'Failed to load AI narrative') : null,
    refetch: () => mutation.mutateAsync(),
  }
}
