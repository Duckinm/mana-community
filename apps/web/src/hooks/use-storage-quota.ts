import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'
import {
  canFitStorageFile,
  isStorageQuotaFull,
  storageQuotaPercent,
  STORAGE_QUOTA_BYTES,
} from '@/lib/storage-quota'
import { useQuery } from '@tanstack/react-query'

export function useStorageQuota() {
  const { data, isPending, isFetching } = useQuery({
    queryKey: queryKeys.storageQuota,
    queryFn: async () => expectEden(await client.api.storage.quota.get()),
    staleTime: 60_000,
  })

  const usedBytes = data?.usedBytes ?? 0
  const quotaBytes = data ? data.limitBytes : STORAGE_QUOTA_BYTES

  return {
    usedBytes,
    fileCount: data?.fileCount ?? 0,
    quotaBytes,
    percent: storageQuotaPercent(usedBytes, quotaBytes),
    isPending,
    isFetching,
    isFull: isStorageQuotaFull(usedBytes, quotaBytes),
    isAlmostFull: storageQuotaPercent(usedBytes, quotaBytes) >= 80,
    canFitFile: (size: number) => canFitStorageFile(usedBytes, size, quotaBytes),
  }
}
