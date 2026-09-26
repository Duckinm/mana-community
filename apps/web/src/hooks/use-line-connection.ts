import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'

export function useLineConnection() {
  const queryClient = useQueryClient()

  const connectionQuery = useQuery({
    queryKey: queryKeys.lineConnection,
    queryFn: async () => expectEden(await client.api.line.connection.get()),
    refetchInterval: (query) => (query.state.data?.pending ? 3000 : false),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.lineConnection })
  }

  const connectMutation = useMutation({
    mutationFn: async () => expectEden(await client.api.line.connect.post()),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.lineConnection, data)
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => expectEden(await client.api.line.connection.delete()),
    onSuccess: invalidate,
  })

  return {
    connection: connectionQuery.data,
    isLoading: connectionQuery.isLoading,
    connect: connectMutation.mutateAsync,
    disconnect: disconnectMutation.mutateAsync,
    isPending: connectMutation.isPending || disconnectMutation.isPending,
    refetch: connectionQuery.refetch,
  }
}
