import { useStorageQuota } from '@/hooks/use-storage-quota'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function useStorageUploadGuard() {
  const { t } = useTranslation('storage')
  const { isFull, isPending } = useStorageQuota()

  const notifyBlocked = useCallback(() => {
    toast.error(t('quotaFullTitle'), { description: t('quotaFullDescription') })
  }, [t])

  const guardUpload = useCallback(
    (action: () => void) => {
      if (!isPending && isFull) {
        notifyBlocked()
        return false
      }
      action()
      return true
    },
    [isFull, isPending, notifyBlocked],
  )

  return { isFull, isPending, notifyBlocked, guardUpload }
}
