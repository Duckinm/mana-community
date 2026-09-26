import type { ErrorComponentProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function AppErrorFallback({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation('common')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-surface-page">
      <div className="text-center space-y-3 max-w-md">
        <p className="text-base font-semibold text-foreground">{t('somethingWentWrong')}</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : t('unexpectedError')}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        {t('tryAgain')}
      </Button>
    </div>
  )
}
