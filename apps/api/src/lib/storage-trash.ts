export const STORAGE_TRASH_RETENTION_DAYS = 14

export function storageTrashCutoffDate(now = Date.now()) {
  return new Date(now - STORAGE_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000)
}
