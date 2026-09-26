import { DOCUMENT_TYPE_KEYS } from '@/components/documents/constants'
import type { DocumentType } from '@/components/documents/types'
import { ChevronRight, Plus } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

const TYPE_COLORS: Record<DocumentType, string> = {
  QO: 'var(--warning)',
  INV: 'var(--primary)',
  RC: 'var(--category-green)',
}

export function DocumentTypeHeader({
  type,
  count,
  collapsed,
  onToggle,
  onAdd,
  className,
}: {
  type: DocumentType
  count: number
  collapsed?: boolean
  onToggle?: () => void
  onAdd?: () => void
  className?: string
}) {
  const { t } = useTranslation('documents')
  const color = TYPE_COLORS[type]

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="group/hdr flex min-w-0 items-center gap-2 text-left"
      >
        <ChevronRight
          size={14}
          strokeWidth={2}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            !collapsed && 'rotate-90',
          )}
        />
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="text-xs font-medium text-foreground">
          {t(DOCUMENT_TYPE_KEYS[type])}
        </span>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </button>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={t('list.newDocument')}
          className="rounded-lg p-0.5 text-muted-foreground opacity-80 transition-all hover:bg-accent hover:opacity-100"
        >
          <Plus size={17} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
