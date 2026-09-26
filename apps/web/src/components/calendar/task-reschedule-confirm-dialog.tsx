import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskTitle?: string
  currentDue: string
  newDue: string
  onConfirm: () => void
}

export function TaskRescheduleConfirmDialog({
  open,
  onOpenChange,
  taskTitle,
  currentDue,
  newDue,
  onConfirm,
}: Props) {
  const { t } = useTranslation('calendar')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rescheduleDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('rescheduleDialog.description', {
              title: taskTitle,
              current: currentDue,
              next: newDue,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('rescheduleDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
              onOpenChange(false)
            }}
          >
            {t('rescheduleDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
