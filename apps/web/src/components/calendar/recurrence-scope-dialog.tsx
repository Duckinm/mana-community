import { useTranslation } from 'react-i18next'
import type { RecurrenceScope } from '@/lib/calendar-recurrence'
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
import { Button } from '@/components/ui/button'

type RecurrenceScopeDialogProps = {
  open: boolean
  mode: 'edit' | 'delete'
  onClose: () => void
  onSelect: (scope: RecurrenceScope) => void
}

export function RecurrenceScopeDialog({
  open,
  mode,
  onClose,
  onSelect,
}: RecurrenceScopeDialogProps) {
  const { t } = useTranslation('calendar')

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'delete' ? t('recurrence.deleteTitle') : t('recurrence.editTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('recurrence.scopeDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Button type="button" variant="outline" onClick={() => onSelect('single')}>
            {t('recurrence.scopeSingle')}
          </Button>
          <Button type="button" variant="outline" onClick={() => onSelect('following')}>
            {t('recurrence.scopeFollowing')}
          </Button>
          <Button type="button" variant="outline" onClick={() => onSelect('all')}>
            {t('recurrence.scopeAll')}
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('form.cancel')}</AlertDialogCancel>
          <AlertDialogAction className="hidden" />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
