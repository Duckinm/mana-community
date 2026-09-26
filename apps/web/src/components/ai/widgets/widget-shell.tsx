import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from '@/components/icons'

interface Props {
  icon: ReactNode
  label: string
  children: ReactNode
  onPreview?: () => void
  fullPageAction?: ReactNode
}

export function AiWidgetShell({ icon, label, children, onPreview, fullPageAction }: Props) {
  const { t } = useTranslation('chat')
  const interactive = !!onPreview

  return (
    <div className="rounded-xl border border-border bg-card p-3 text-left">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            className="text-2xs font-medium text-primary hover:underline"
          >
            {t('widget.preview')}
          </button>
        )}
      </div>
      {interactive ? (
        <button
          type="button"
          onClick={onPreview}
          className="group w-full text-left"
        >
          {children}
        </button>
      ) : (
        children
      )}
      {fullPageAction && (
        <div className="mt-2 flex justify-end border-t border-border-subtle pt-2">
          {fullPageAction}
        </div>
      )}
    </div>
  )
}

export function FullPageLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-2xs font-medium text-muted-foreground hover:text-primary ${className ?? ''}`}>
      {children}
      <ArrowUpRight size={11} />
    </span>
  )
}
