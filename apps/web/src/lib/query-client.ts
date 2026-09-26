import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { handleQueryError, isUnauthorizedError } from '@/lib/api-error'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleQueryError }),
  mutationCache: new MutationCache({ onError: handleQueryError }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) return false
        return failureCount < 1
      },
    },
    mutations: { retry: 0 },
  },
})
