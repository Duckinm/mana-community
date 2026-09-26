import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import type { Wallet } from '@/components/finance/types'

export function useWallets() {
  const { data: wallets = [], isLoading } = useQuery({
    queryKey: queryKeys.wallets,
    queryFn: async () => {
      const result = await client.api.wallets.get()
      if (result.error) throw result.error
      return result.data as Wallet[]
    },
    staleTime: 60_000,
  })

  return { wallets, isLoading }
}
