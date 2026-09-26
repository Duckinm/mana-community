import type { StorageFile } from '@/components/storage/types'
import { useStorage } from '@/context/storage'
import { showStorageTrashToast } from '@/lib/storage-trash-toast'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'

export function useStorageFileTrashActions() {
  const { deleteFile, restoreFile } = useStorage()
  const [pendingIds, setPendingIds] = useState<string[] | null>(null)
  const [trashing, setTrashing] = useState(false)

  const requestTrash = useCallback((fileIds: string[]) => {
    if (fileIds.length === 0) return
    setPendingIds(fileIds)
  }, [])

  const cancelTrash = useCallback(() => {
    setPendingIds(null)
  }, [])

  const confirmTrash = useCallback(
    async (onSuccess?: (fileIds: string[]) => void) => {
      if (!pendingIds?.length) return
      const ids = [...pendingIds]
      setTrashing(true)
      try {
        await Promise.all(ids.map((id) => deleteFile(id)))
        setPendingIds(null)
        showStorageTrashToast(ids.length, async () => {
          try {
            await Promise.all(ids.map((id) => restoreFile(id)))
            toast.success(
              ids.length === 1
                ? i18next.t('fileRestored', { ns: 'storage' })
                : i18next.t('filesRestored', { ns: 'storage', count: ids.length }),
            )
          } catch {
            toast.error(i18next.t('failedToRestoreFile', { ns: 'storage' }))
          }
        })
        onSuccess?.(ids)
      } catch {
        toast.error(i18next.t('moveToTrashFailed', { ns: 'storage' }))
      } finally {
        setTrashing(false)
      }
    },
    [deleteFile, pendingIds, restoreFile],
  )

  const primaryFileName = useCallback(
    (files: StorageFile[]) => {
      if (!pendingIds?.length) return undefined
      const file = files.find((f) => f.id === pendingIds[0])
      return file?.name
    },
    [pendingIds],
  )

  return {
    pendingIds,
    trashing,
    requestTrash,
    cancelTrash,
    confirmTrash,
    primaryFileName,
  }
}
