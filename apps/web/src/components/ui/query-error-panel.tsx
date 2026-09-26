import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

interface QueryErrorPanelProps {
  onRetry?: () => void
  message?: string
  className?: string
}

export function QueryErrorPanel({ onRetry, message, className }: QueryErrorPanelProps) {
  const { t } = useTranslation('common')

  return (
    <div
      className={`py-8 text-center border border-dashed border-danger/30 rounded-xl space-y-2 ${className ?? ''}`}
    >
      <p className="text-sm text-danger">{message ?? t('loadFailed')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
    </div>
  )
}
