import i18next from '@/lib/i18n'

export const STORAGE_TRASH_RETENTION_DAYS = 14

export function storageTrashDaysRemaining(deletedAt: string, now = Date.now()) {
  const ms = now - new Date(deletedAt).getTime()
  return Math.max(0, STORAGE_TRASH_RETENTION_DAYS - Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export function formatStorageTrashDeletedDate(deletedAt: string) {
  return new Date(deletedAt).toLocaleDateString(i18next.language, {
    month: 'short',
    day: 'numeric',
  })
}
