import { resolveApiBaseUrl } from "@/lib/api-base-url";
import type { ApiTransaction } from '@/lib/api-types'

const BASE_URL = resolveApiBaseUrl()

// ponytail: fixed 3-wide pool, not a queue library. Each import is a ~5s vision call, so this
// keeps a 20-photo batch off the provider's rate limit without serialising the whole batch.
const RECEIPT_IMPORT_CONCURRENCY = 3

export type ReceiptImportResult = {
  file: File
  transaction?: ApiTransaction
  error?: string
}

export async function importReceipt(file: File): Promise<{ transaction: ApiTransaction }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/api/finance/transactions/import-receipt`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? 'Receipt import failed')
  }
  return (await res.json()) as { transaction: ApiTransaction }
}

/** Imports every file, keeping one failure from cancelling the rest of the batch. */
export async function importReceipts(files: File[]): Promise<ReceiptImportResult[]> {
  const results: ReceiptImportResult[] = []
  let cursor = 0

  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor++]
      try {
        const { transaction } = await importReceipt(file)
        results.push({ file, transaction })
      } catch (err) {
        results.push({ file, error: err instanceof Error ? err.message : undefined })
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(RECEIPT_IMPORT_CONCURRENCY, files.length) }, worker),
  )

  return results
}
