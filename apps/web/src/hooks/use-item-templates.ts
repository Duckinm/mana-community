import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { makeOptimisticMutation } from '@/lib/optimistic-mutation'
import { queryKeys } from '@/lib/query-keys'
import { invalidateItemTemplates } from '@/lib/invalidate-helpers'

export type ItemTemplate = {
  id: string
  userId: string
  name: string
  description: string
  defaultQty: number
  defaultUnitPriceCents: number
  currency: string
  position: number
  imageR2Key: string | null
  imageUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
  imageBlurDataUrl: string | null
  createdAt: string
  updatedAt: string
}

export function useItemTemplates() {
  const queryClient = useQueryClient()

  const { data: templates = [], isLoading } = useQuery({
    queryKey: queryKeys.itemTemplates,
    queryFn: async () => expectEden(await client.api['item-templates'].get()),
  })

  const createMutation = useMutation({
    mutationFn: async (body: {
      name: string
      description?: string
      defaultQty?: number
      defaultUnitPriceCents?: number
      currency?: string
    }) => expectEden(await client.api['item-templates'].post(body)),
    onSuccess: () => { void invalidateItemTemplates(queryClient) },
    onError: (_err, body) =>
      toast.error(i18next.t('templateLibrary.createTemplateFailed', { ns: 'documents' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => createMutation.mutate(body) },
      }),
  })

  const updateMutation = useMutation(
    makeOptimisticMutation<ItemTemplate, Error, {
      id: string
      name?: string
      description?: string
      defaultQty?: number
      defaultUnitPriceCents?: number
      currency?: string
    }>(queryClient, queryKeys.itemTemplates, {
      mutationFn: async ({ id, ...body }) => expectEden(await client.api['item-templates']({ id }).patch(body)),
      optimisticUpdate: (prev, { id, ...body }) => prev.map((t) => (t.id === id ? { ...t, ...body } : t)),
      onError: (_err, vars) =>
        toast.error(i18next.t('templateLibrary.updateTemplateFailed', { ns: 'documents' }), {
          action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => updateMutation.mutate(vars) },
        }),
    }),
  )

  const deleteMutation = useMutation(
    makeOptimisticMutation<ItemTemplate, Error, string>(queryClient, queryKeys.itemTemplates, {
      mutationFn: async (id) => {
        expectEdenVoid(await client.api['item-templates']({ id }).delete())
        return { id } as ItemTemplate
      },
      optimisticUpdate: (prev, id) => prev.filter((t) => t.id !== id),
      onError: (_err, id) =>
        toast.error(i18next.t('templateLibrary.deleteTemplateFailed', { ns: 'documents' }), {
          action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => deleteMutation.mutate(id) },
        }),
    }),
  )

  return {
    templates,
    isLoading,
    createTemplate: (body: Parameters<typeof createMutation.mutateAsync>[0]) =>
      createMutation.mutateAsync(body),
    updateTemplate: (body: Parameters<typeof updateMutation.mutateAsync>[0]) =>
      updateMutation.mutateAsync(body),
    deleteTemplate: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
