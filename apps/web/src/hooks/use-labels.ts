import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { makeOptimisticMutation } from '@/lib/optimistic-mutation'
import { queryKeys } from '@/lib/query-keys'
import type { Label } from '@/components/projects/types'

export function useLabels() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.labels,
    queryFn: async () => expectEden(await client.api.labels.get()),
  })

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; color: string }) =>
      expectEden(await client.api.labels.post(body)),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: queryKeys.labels }) },
    onError: (_err, body) =>
      toast.error(i18next.t('labels.createFailed', { ns: 'settings' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => createMutation.mutate(body) },
      }),
  })

  const updateMutation = useMutation(
    makeOptimisticMutation<Label, Error, { id: string; patch: { name?: string; color?: string } }>(
      queryClient,
      queryKeys.labels,
      {
        mutationFn: async ({ id, patch }) => expectEden(await client.api.labels({ id }).patch(patch)),
        optimisticUpdate: (prev, { id, patch }) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        onError: (_err, vars) =>
          toast.error(i18next.t('labels.updateFailed', { ns: 'settings' }), {
            action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => updateMutation.mutate(vars) },
          }),
      },
    ),
  )

  const deleteMutation = useMutation(
    makeOptimisticMutation<Label, Error, string>(
      queryClient,
      queryKeys.labels,
      {
        mutationFn: async (id) => {
          expectEdenVoid(await client.api.labels({ id }).delete())
          return { id } as Label
        },
        optimisticUpdate: (prev, id) => prev.filter((l) => l.id !== id),
        onError: (_err, id) =>
          toast.error(i18next.t('labels.deleteFailed', { ns: 'settings' }), {
            action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => deleteMutation.mutate(id) },
          }),
      },
    ),
  )

  // onError toasts own failure feedback — swallow rejections so callers never leak unhandled ones
  return {
    labels: query.data ?? [],
    isLoading: query.isLoading,
    createLabel: (body: { name: string; color: string }) =>
      createMutation.mutateAsync(body).catch(() => null),
    updateLabel: (vars: { id: string; patch: { name?: string; color?: string } }) =>
      updateMutation.mutateAsync(vars).catch(() => null),
    deleteLabel: (id: string) => deleteMutation.mutateAsync(id).catch(() => null),
  }
}
