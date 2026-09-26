import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { makeOptimisticMutation } from '@/lib/optimistic-mutation'
import { queryKeys } from '@/lib/query-keys'
import type { Milestone } from '@/components/projects/types'
import type { TiptapDoc } from '@/lib/rich-text'

export function useMilestones(projectId: string | null) {
  const queryClient = useQueryClient()
  const key = queryKeys.projectMilestones(projectId ?? '')

  const query = useQuery({
    queryKey: key,
    queryFn: async () =>
      expectEden(await client.api.projects({ id: projectId! }).milestones.get()),
    enabled: !!projectId,
    refetchOnMount: 'always',
  })

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; dueDate?: string; description?: TiptapDoc | null }) =>
      expectEden(await client.api.projects({ id: projectId! }).milestones.post(body)),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: key }) },
    onError: (_err, body) =>
      toast.error(i18next.t('milestones.createFailed', { ns: 'projects' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => createMutation.mutate(body) },
      }),
  })

  const updateMutation = useMutation(
    makeOptimisticMutation<Milestone, Error, { id: string; patch: Partial<Pick<Milestone, 'name' | 'dueDate' | 'description' | 'status'>> }>(
      queryClient,
      key,
      {
        mutationFn: async ({ id, patch }) => expectEden(await client.api.milestones({ id }).patch(patch)),
        optimisticUpdate: (prev, { id, patch }) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        onError: (_err, vars) =>
          toast.error(i18next.t('milestones.updateFailed', { ns: 'projects' }), {
            action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => updateMutation.mutate(vars) },
          }),
      },
    ),
  )

  const deleteMutation = useMutation(
    makeOptimisticMutation<Milestone, Error, string>(
      queryClient,
      key,
      {
        mutationFn: async (id) => {
          expectEdenVoid(await client.api.milestones({ id }).delete())
          return { id } as Milestone
        },
        optimisticUpdate: (prev, id) => prev.filter((m) => m.id !== id),
        onError: (_err, id) =>
          toast.error(i18next.t('milestones.deleteFailed', { ns: 'projects' }), {
            action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => deleteMutation.mutate(id) },
          }),
      },
    ),
  )

  // onError toasts own failure feedback — swallow rejections so callers never leak unhandled ones
  return {
    milestones: query.data ?? [],
    isLoading: query.isLoading,
    createMilestone: (body: { name: string; dueDate?: string; description?: TiptapDoc | null }) =>
      createMutation.mutateAsync(body).catch(() => null),
    updateMilestone: (vars: {
      id: string
      patch: Partial<Pick<Milestone, 'name' | 'dueDate' | 'description' | 'status'>>
    }) => updateMutation.mutateAsync(vars).catch(() => null),
    deleteMilestone: (id: string) => deleteMutation.mutateAsync(id).catch(() => null),
  }
}
