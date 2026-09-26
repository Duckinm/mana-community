import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface EntityNotFoundProps {
  title?: string
  description?: string
  backTo: string
  backLabel?: string
}

export function EntityNotFound({ title, description, backTo, backLabel }: EntityNotFoundProps) {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-base font-semibold text-foreground">
          {title ?? t('entityNotFoundTitle')}
        </p>
        <p className="text-sm text-muted-foreground">
          {description ?? t('entityNotFoundDescription')}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to={backTo}>{backLabel ?? t('goBack')}</Link>
      </Button>
    </div>
  )
}
