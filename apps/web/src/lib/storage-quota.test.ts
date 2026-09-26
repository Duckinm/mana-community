import { expect, test } from 'vitest'
import { canFitStorageFile, isStorageQuotaFull, storageQuotaPercent } from '@/lib/storage-quota'

test('an unlimited quota permits storage above the Cloud cap without a full warning', () => {
  const used = 2 * 1024 ** 3
  expect(canFitStorageFile(used, 1024, null)).toBe(true)
  expect(isStorageQuotaFull(used, null)).toBe(false)
  expect(storageQuotaPercent(used, null)).toBe(0)
  expect(canFitStorageFile(used, 1024)).toBe(false)
  expect(isStorageQuotaFull(used)).toBe(true)
})
