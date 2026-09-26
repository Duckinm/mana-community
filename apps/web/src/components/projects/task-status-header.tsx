import { TASK_STATUS_ICON } from '@/components/projects/status-styles'
import type { Status } from '@/components/projects/types'
import { ChevronRight, Plus } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export function TaskStatusHeader({
  status,
  label,
  color,
  count,
  collapsed,
  onToggle,
  onAdd,
  showChevron = false,
  className,
}: {
  status: Status
  label: string
  color: string
  count: number | string
  collapsed?: boolean
  onToggle?: () => void
  onAdd?: () => void
  showChevron?: boolean
  className?: string
}) {
  const { t } = useTranslation('projects')
  const Icon = TASK_STATUS_ICON[status]

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="group/hdr flex min-w-0 items-center gap-1.5 text-left"
      >
        {showChevron && (
          <ChevronRight
            size={14}
            strokeWidth={2}
            className={cn(
              'shrink-0 text-muted-foreground transition-transform',
              !collapsed && 'rotate-90',
            )}
          />
        )}
        <span className="flex min-w-0 items-center gap-1">
          <Icon size={14} strokeWidth={2} style={{ color }} className="shrink-0" />
          <span className="text-xs font-medium text-foreground transition-colors group-hover/hdr:text-foreground">
            {label}
          </span>
        </span>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
      </button>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`${t('board.addTask')} — ${label}`}
          className="flex shrink-0 items-center justify-center rounded-lg p-0.5 text-muted-foreground opacity-80 transition-all hover:bg-accent hover:opacity-100 max-xl:size-11 max-xl:p-0"
        >
          <Plus size={17} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
