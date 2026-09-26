import type { QueryClient, QueryKey, UseMutationOptions } from '@tanstack/react-query'

type OptimisticMutationOpts<TItem, TResult, TError, TVars> = {
  mutationFn: (vars: TVars) => Promise<TResult>
  optimisticUpdate: (current: TItem[], vars: TVars) => TItem[]
  onSuccess?: (data: TResult, vars: TVars, ctx: { previous: TItem[] | undefined }) => void
  onError?: (err: TError, vars: TVars, ctx: { previous: TItem[] | undefined }) => void
  onSettled?: (data: TResult | undefined, err: TError | null, vars: TVars) => void
}

export function makeOptimisticMutation<TItem, TError, TVars, TResult = TItem>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  opts: OptimisticMutationOpts<TItem, TResult, TError, TVars>,
): UseMutationOptions<TResult, TError, TVars, { previous: TItem[] | undefined }> {
  return {
    mutationFn: opts.mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TItem[]>(queryKey)
      queryClient.setQueryData<TItem[]>(queryKey, (prev = []) => opts.optimisticUpdate(prev, vars))
      return { previous }
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
      opts.onError?.(err, vars, ctx ?? { previous: undefined })
    },
    onSuccess: (data, vars, ctx) => {
      opts.onSuccess?.(data, vars, ctx ?? { previous: undefined })
    },
    onSettled: (data, err, vars) => {
      queryClient.invalidateQueries({ queryKey })
      opts.onSettled?.(data, err, vars)
    },
  }
}
