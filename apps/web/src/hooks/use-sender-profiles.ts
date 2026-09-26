import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import {
  appendListOrderId,
  captureListOrder,
  flipDefaultInList,
  removeListOrderId,
} from '@/lib/business-list-order'
import { queryKeys } from '@/lib/query-keys'
import { makeOptimisticMutation } from '@/lib/optimistic-mutation'
import { defaultSenderProfile } from '@/lib/selectors'
import type { SenderProfile } from '@/components/documents/wizard/document-wizard-state'

export type SenderProfileInput = {
  name: string
  defaultDueDaysOffset: number
  vatRegistered: boolean
  registeredName?: string
  registeredNameEn?: string
  yourEmail?: string
  yourPhone?: string
  registeredAddress?: string
  registeredAddressEn?: string
  yourBranchNumber?: string
  yourCountry?: string
  yourZip?: string
  yourTaxId?: string
  yourLogo?: string
  defaultTaxRateBps: number
}

export function useSenderProfiles() {
  const qc = useQueryClient()

  const { data: senderProfiles = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: queryKeys.senderProfiles,
    queryFn: async () => {
      const rows = expectEden(await client.api.business.senderProfiles.get())
      return captureListOrder(qc, queryKeys.senderProfilesOrder, rows)
    },
    staleTime: 60_000,
  })

  const defaultProfile = defaultSenderProfile(senderProfiles)

  const createProfile = useMutation({
    mutationFn: async (data: SenderProfileInput) =>
      expectEden(await client.api.business.senderProfiles.post(data)),
    onSuccess: (profile) => {
      appendListOrderId(qc, queryKeys.senderProfilesOrder, profile.id)
      qc.invalidateQueries({ queryKey: queryKeys.senderProfiles })
    },
  })

  const updateProfile = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SenderProfileInput> }) =>
      expectEden(await client.api.business.senderProfiles({ id }).patch(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.senderProfiles })
    },
  })

  const deleteProfile = useMutation({
    mutationFn: async (id: string) =>
      expectEdenVoid(await client.api.business.senderProfiles({ id }).delete()),
    onSuccess: (_data, id) => {
      removeListOrderId(qc, queryKeys.senderProfilesOrder, id)
      qc.invalidateQueries({ queryKey: queryKeys.senderProfiles })
    },
  })

  const setDefault = useMutation(makeOptimisticMutation<SenderProfile, Error, string, void>(
    qc,
    queryKeys.senderProfiles,
    {
    mutationFn: async (id: string) =>
      expectEdenVoid(await client.api.business.senderProfiles({ id }).setDefault.post()),
    optimisticUpdate: (previous, id) => flipDefaultInList(previous, id),
    onSuccess: (_data, id) => {
      qc.setQueryData<SenderProfile[]>(queryKeys.senderProfiles, (current) =>
        current ? flipDefaultInList(current, id) : current,
      )
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.senderProfiles })
    },
    },
  ))

  return {
    senderProfiles,
    isLoading,
    isFetching,
    isError,
    refetch,
    defaultProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefault,
  }
}
