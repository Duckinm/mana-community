import { useQuery } from '@tanstack/react-query'
import { client, expectEden } from '@/lib/eden'

export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: async ({ signal }) => expectEden(await client.api.capabilities.get({
      fetch: { signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) },
    })),
    staleTime: 60_000,
    retry: 1,
  })
}
