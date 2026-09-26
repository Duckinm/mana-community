import { toast } from 'sonner'
import i18next from '@/lib/i18n'

export function showStorageTrashToast(
  count: number,
  onUndo: () => void | Promise<void>,
) {
  toast.success(
    count === 1
      ? i18next.t('movedToTrash', { ns: 'storage' })
      : i18next.t('movedFilesToTrash', { ns: 'storage', count }),
    {
      action: {
        label: i18next.t('undo', { ns: 'storage' }),
        onClick: () => void onUndo(),
      },
    },
  )
}
