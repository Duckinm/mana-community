import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import { invalidateItemTemplateGroups } from '@/lib/invalidate-helpers'
import type { ItemTemplate } from '@/hooks/use-item-templates'

export type ItemTemplateGroup = {
  id: string
  userId: string
  name: string
  description: string
  color: string
  icon: string | null
  position: number
  createdAt: string
  updatedAt: string
  templates: (Pick<ItemTemplate, 'id' | 'name' | 'description' | 'defaultQty' | 'defaultUnitPriceCents' | 'currency'> & { position: number })[]
}

export function useItemTemplateGroups() {
  const queryClient = useQueryClient()

  const { data: groups = [], isLoading } = useQuery({
    queryKey: queryKeys.itemTemplateGroups,
    queryFn: async () => expectEden(await client.api['item-template-groups'].get()),
  })

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; description?: string; color?: string; icon?: string | null; templateIds?: string[] }) =>
      expectEden(await client.api['item-template-groups'].post(body)),
    onSuccess: () => { void invalidateItemTemplateGroups(queryClient) },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; description?: string; color?: string; icon?: string | null }) =>
      expectEden(await client.api['item-template-groups']({ id }).patch(body)),
    onSuccess: () => { void invalidateItemTemplateGroups(queryClient) },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      expectEdenVoid(await client.api['item-template-groups']({ id }).delete()),
    onSuccess: () => { void invalidateItemTemplateGroups(queryClient) },
  })

  const addMembersMutation = useMutation({
    mutationFn: async ({ id, templateIds }: { id: string; templateIds: string[] }) =>
      expectEdenVoid(
        await client.api['item-template-groups']({ id }).members.post({ templateIds }),
      ),
    onSuccess: () => { void invalidateItemTemplateGroups(queryClient) },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) =>
      expectEdenVoid(
        await client.api['item-template-groups']({ id }).members({ templateId }).delete(),
      ),
    onSuccess: () => { void invalidateItemTemplateGroups(queryClient) },
  })

  return {
    groups,
    isLoading,
    createGroup: (body: Parameters<typeof createMutation.mutateAsync>[0]) => createMutation.mutateAsync(body),
    updateGroup: (body: Parameters<typeof updateMutation.mutateAsync>[0]) => updateMutation.mutateAsync(body),
    deleteGroup: (id: string) => deleteMutation.mutateAsync(id),
    addMembers: (id: string, templateIds: string[]) => addMembersMutation.mutateAsync({ id, templateIds }),
    removeMember: (id: string, templateId: string) => removeMemberMutation.mutateAsync({ id, templateId }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
