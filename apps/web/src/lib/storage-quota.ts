export const STORAGE_QUOTA_BYTES = 1 * 1024 * 1024 * 1024

export function storageQuotaPercent(usedBytes: number, limitBytes: number | null = STORAGE_QUOTA_BYTES): number {
  return limitBytes === null ? 0 : Math.min((usedBytes / limitBytes) * 100, 100)
}

export function isStorageQuotaFull(usedBytes: number, limitBytes: number | null = STORAGE_QUOTA_BYTES): boolean {
  return limitBytes !== null && usedBytes >= limitBytes
}

export function canFitStorageFile(usedBytes: number, fileSize: number, limitBytes: number | null = STORAGE_QUOTA_BYTES): boolean {
  return limitBytes === null || usedBytes + fileSize <= limitBytes
}

export function parseStorageUploadError(
  body: unknown,
  statusText: string,
  fallback = 'Upload failed',
): string {
  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>
    if (typeof record.error === 'string' && record.error.length > 0) return record.error
    if (typeof record.message === 'string' && record.message.length > 0) return record.message
  }
  return statusText || fallback
}

export function isStorageQuotaError(message: string): boolean {
  return /quota exceeded|storage full|storage quota|payload too large/i.test(message)
}
