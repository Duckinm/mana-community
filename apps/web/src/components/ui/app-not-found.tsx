import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function AppNotFound() {
  const { t } = useTranslation('common')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-surface-page">
      <div className="text-center space-y-3 max-w-sm">
        <p className="text-4xl font-bold font-mono text-foreground">404</p>
        <p className="text-base text-muted-foreground">{t('notFoundTitle')}</p>
        <p className="text-xs text-caption">{t('notFoundDescription')}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/chat">{t('goHome')}</Link>
      </Button>
    </div>
  )
}
