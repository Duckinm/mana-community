import type { RemarkTemplate, RemarkTemplateInput } from '@/components/documents/remark-template-types'
import type { DocumentType } from '@/components/documents/types'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import {
  appendListOrderId,
  captureListOrder,
  removeListOrderId,
} from '@/lib/business-list-order'
import { invalidateRemarkTemplates } from '@/lib/invalidate-helpers'
import { queryKeys } from '@/lib/query-keys'
import { makeOptimisticMutation } from '@/lib/optimistic-mutation'
import { defaultRemarkTemplate } from '@/lib/selectors'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type { RemarkTemplate, RemarkTemplateInput }

function isDocumentType(value: string): value is DocumentType {
  return value === 'QO' || value === 'INV' || value === 'RC'
}

function toggleDocumentType(defaultFor: DocumentType[], documentType: DocumentType): DocumentType[] {
  return defaultFor.includes(documentType)
    ? defaultFor.filter((type) => type !== documentType)
    : [...defaultFor, documentType]
}

export function useRemarkTemplates() {
  const qc = useQueryClient()

  const { data: remarkTemplates = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.remarkTemplates,
    queryFn: async () => {
      const rows = expectEden(await client.api.business.remarkTemplates.get())
      const templates: RemarkTemplate[] = rows.map((row) => ({
        ...row,
        defaultFor: row.defaultFor.filter(isDocumentType),
      }))
      return captureListOrder(qc, queryKeys.remarkTemplatesOrder, templates)
    },
    staleTime: 60_000,
  })

  const defaultTemplateFor = (documentType: DocumentType) =>
    defaultRemarkTemplate(remarkTemplates, documentType)

  const createTemplate = useMutation({
    mutationFn: async (data: RemarkTemplateInput) =>
      expectEden(await client.api.business.remarkTemplates.post(data)),
    onSuccess: (template) => {
      appendListOrderId(qc, queryKeys.remarkTemplatesOrder, template.id)
      void invalidateRemarkTemplates(qc)
    },
  })

  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RemarkTemplateInput> }) =>
      expectEden(await client.api.business.remarkTemplates({ id }).patch(data)),
    onSuccess: () => {
      void invalidateRemarkTemplates(qc)
    },
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) =>
      expectEdenVoid(await client.api.business.remarkTemplates({ id }).delete()),
    onSuccess: (_data, id) => {
      removeListOrderId(qc, queryKeys.remarkTemplatesOrder, id)
      void invalidateRemarkTemplates(qc)
    },
  })

  // ponytail: PATCH already reassigns the type away from other templates, so the
  // add-only setDefault endpoint isn't needed here
  const toggleDefault = useMutation(makeOptimisticMutation<RemarkTemplate, Error, { id: string; documentType: DocumentType }>(
    qc,
    queryKeys.remarkTemplates,
    {
    mutationFn: async ({ id, documentType }: { id: string; documentType: DocumentType }) => {
      const template = remarkTemplates.find((row) => row.id === id)
      const updated = expectEden(
        await client.api.business.remarkTemplates({ id }).patch({
          defaultFor: toggleDocumentType(template?.defaultFor ?? [], documentType),
        }),
      )
      return { ...updated, defaultFor: updated.defaultFor.filter(isDocumentType) }
    },
    optimisticUpdate: (previous, { id, documentType }) => {
      const turningOn = !previous.find((template) => template.id === id)?.defaultFor.includes(documentType)
      return previous.map((template) => ({
          ...template,
          defaultFor: template.id === id
            ? toggleDocumentType(template.defaultFor, documentType)
            : turningOn
              ? template.defaultFor.filter((type) => type !== documentType)
              : template.defaultFor,
        }))
    },
    onSettled: () => {
      void invalidateRemarkTemplates(qc)
    },
    },
  ))

  return {
    remarkTemplates,
    isLoading,
    isError,
    refetch,
    defaultTemplateFor,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleDefault,
  }
}
