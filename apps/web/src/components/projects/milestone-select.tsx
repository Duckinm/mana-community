import { ChevronDown } from '@/components/icons'
import { MilestoneDiamond } from '@/components/icons/milestone-diamond'
import {
  milestoneDiamondClass,
  milestoneDiamondClassMuted,
} from '@/components/projects/milestone-styles'
import type { Milestone } from '@/components/projects/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

type MilestoneSelectProps = {
  value: string | null
  milestones: Milestone[]
  onChange: (milestoneId: string | null) => void
  size?: 'sm' | 'default'
  className?: string
}

export function MilestoneSelect({
  value,
  milestones,
  onChange,
  size = 'default',
  className,
}: MilestoneSelectProps) {
  const { t } = useTranslation('projects')
  const active = milestones.find((m) => m.id === value)
  const compact = size === 'sm'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-w-0 items-center gap-1.5 rounded-lg border border-border bg-surface-raised font-medium text-foreground transition-colors hover:bg-surface-overlay',
            compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
            className,
          )}
        >
          <MilestoneDiamond
            size={11}
            strokeWidth={2}
            className={active ? milestoneDiamondClass(active) : milestoneDiamondClassMuted()}
          />
          <span className={cn('min-w-0 truncate', compact ? 'flex-1 text-sm' : 'max-w-[120px]')}>
            {active?.name ?? (compact ? '—' : t('taskDetail.noMilestone'))}
          </span>
          {!compact && (
            <ChevronDown size={11} strokeWidth={2} className="shrink-0 text-muted-foreground" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={value ?? ''}
          onValueChange={(v) => onChange(v === '' ? null : v)}
        >
          <DropdownMenuRadioItem value="">
            <span className="flex items-center gap-2">
              <MilestoneDiamond
                size={11}
                strokeWidth={2}
                className={milestoneDiamondClassMuted()}
              />
              {t('taskDetail.noMilestone')}
            </span>
          </DropdownMenuRadioItem>
          {milestones.map((m) => (
            <DropdownMenuRadioItem key={m.id} value={m.id}>
              <span className="flex items-center gap-2">
                <MilestoneDiamond
                  size={11}
                  strokeWidth={2}
                  className={milestoneDiamondClass(m)}
                />
                {m.name}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
