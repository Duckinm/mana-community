import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'
import { ApiError } from '@/lib/api-error'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { applyDocumentDisplayStatus } from '@/lib/document-display-status'
import { queryKeys } from '@/lib/query-keys'
import { makeOptimisticMutation } from '@/lib/optimistic-mutation'
import { invalidateDocument, invalidateDocuments } from '@/lib/invalidate-helpers'
import type { Document, CreateDocumentInput } from '@/components/documents/types'
import type { ApiPromoteDocumentBody as PromoteDocumentBody } from '@/lib/api-types'

export function useDocumentMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (body: CreateDocumentInput) =>
      applyDocumentDisplayStatus(
        expectEden(
          await client.api.documents.post({
            ...body,
            senderProfileId: body.senderProfileId ?? undefined,
            items: body.items ?? [],
          }),
        ),
      ),
    onSuccess: (doc) => {
      void invalidateDocument(queryClient, doc.id)
    },
    onError: () => toast.error(i18next.t('toast.createDocumentFailed', { ns: 'documents' })),
  })

  const updateMutation = useMutation(makeOptimisticMutation<Document, Error, { id: string; patch: Partial<CreateDocumentInput> }>(
    queryClient,
    queryKeys.documents,
    {
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CreateDocumentInput> }) =>
      applyDocumentDisplayStatus(expectEden(await client.api.documents({ id }).patch(patch))),
    optimisticUpdate: (previous, { id, patch }) =>
      previous.map((document) => (document.id === id ? ({ ...document, ...patch } as Document) : document)),
    onError: () => {
      toast.error(i18next.t('toast.saveDocumentFailed', { ns: 'documents' }))
    },
    onSettled: (_data, _err, { id }) => {
      void invalidateDocument(queryClient, id)
    },
    },
  ))

  const deleteMutation = useMutation(makeOptimisticMutation<Document, Error, string, void>(
    queryClient,
    queryKeys.documents,
    {
    mutationFn: async (id: string) => expectEdenVoid(await client.api.documents({ id }).delete()),
    optimisticUpdate: (previous, id) => previous.filter((document) => document.id !== id),
    onError: () => {
      toast.error(i18next.t('toast.deleteDocumentFailed', { ns: 'documents' }))
    },
    onSettled: () => {
      void invalidateDocuments(queryClient)
    },
    },
  ))

  const publishMutation = useMutation({
    mutationFn: async ({ id, sendEmail }: { id: string; sendEmail?: boolean }) => {
      const { emailStatus, ...doc } = expectEden(
        await client.api.documents({ id }).publish.post({ sendEmail }),
      )
      return { document: applyDocumentDisplayStatus(doc), emailStatus }
    },
    onSuccess: ({ document }) => {
      void invalidateDocument(queryClient, document.id)
    },
    onError: (err) => {
      const incomplete =
        err instanceof ApiError && err.message.startsWith('cannot publish tax invoice')
      toast.error(
        i18next.t(incomplete ? 'toast.publishTaxInvoiceIncomplete' : 'toast.publishDocumentFailed', {
          ns: 'documents',
        }),
      )
    },
  })

  const promoteMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: PromoteDocumentBody }) =>
      applyDocumentDisplayStatus(expectEden(await client.api.documents({ id }).promote.post(body))),
    onSuccess: (doc) => {
      void invalidateDocument(queryClient, doc.id)
    },
    onError: () => toast.error(i18next.t('toast.convertDocumentFailed', { ns: 'documents' })),
  })

  const sendEmailMutation = useMutation({
    mutationFn: async (id: string) =>
      expectEden(await client.api.documents({ id })['send-email'].post()),
    onSuccess: (_result, id) => {
      void invalidateDocument(queryClient, id)
    },
    onError: () => toast.error(i18next.t('toast.sendEmailFailed', { ns: 'documents' })),
  })

  const sendEtaxMutation = useMutation({
    mutationFn: async (id: string) =>
      expectEden(await client.api.documents({ id })['send-etax'].post()),
    onSuccess: (_result, id) => {
      void invalidateDocument(queryClient, id)
    },
  })

  const revokePublicLinkMutation = useMutation({
    mutationFn: async (id: string) =>
      applyDocumentDisplayStatus(
        expectEden(await client.api.documents({ id })['public-link'].revoke.post()),
      ),
    onSuccess: (doc) => {
      void invalidateDocument(queryClient, doc.id)
    },
  })

  const rotatePublicLinkMutation = useMutation({
    mutationFn: async (id: string) =>
      applyDocumentDisplayStatus(
        expectEden(await client.api.documents({ id })['public-link'].rotate.post()),
      ),
    onSuccess: (doc) => {
      void invalidateDocument(queryClient, doc.id)
    },
  })

  return {
    createDocument: (body: CreateDocumentInput) => createMutation.mutateAsync(body),
    updateDocument: (id: string, patch: Partial<CreateDocumentInput>) =>
      updateMutation.mutateAsync({ id, patch }),
    deleteDocument: (id: string) => deleteMutation.mutateAsync(id),
    publishDocument: (id: string, sendEmail?: boolean) => publishMutation.mutateAsync({ id, sendEmail }),
    promoteDocument: (id: string, body: PromoteDocumentBody) =>
      promoteMutation.mutateAsync({ id, body }),
    sendDocumentEmail: (id: string) => sendEmailMutation.mutateAsync(id),
    sendDocumentEtax: (id: string) => sendEtaxMutation.mutateAsync(id),
    revokeDocumentPublicLink: (id: string) => revokePublicLinkMutation.mutateAsync(id),
    rotateDocumentPublicLink: (id: string) => rotatePublicLinkMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
