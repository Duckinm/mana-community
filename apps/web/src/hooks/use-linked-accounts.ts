import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { linkSocial, listAccounts, unlinkAccount } from '@/lib/auth-client'
import { queryKeys } from '@/lib/query-keys'

export type LinkedProvider = 'google' | 'discord' | 'facebook'

export function useLinkedAccounts() {
  const queryClient = useQueryClient()

  const accountsQuery = useQuery({
    queryKey: queryKeys.linkedAccounts,
    queryFn: async () => {
      const { data, error } = await listAccounts()
      if (error) throw error
      return data ?? []
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.linkedAccounts })

  const connectMutation = useMutation({
    mutationFn: async (provider: LinkedProvider) => {
      const callbackURL = `${window.location.origin}/settings/profile`
      const { error } = await linkSocial({ provider, callbackURL, errorCallbackURL: callbackURL })
      if (error) throw error
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async (provider: LinkedProvider) => {
      const { error } = await unlinkAccount({ providerId: provider })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    accounts: accountsQuery.data ?? [],
    isLoading: accountsQuery.isLoading,
    connect: connectMutation.mutateAsync,
    disconnect: disconnectMutation.mutateAsync,
    isPending: connectMutation.isPending || disconnectMutation.isPending,
  }
}
