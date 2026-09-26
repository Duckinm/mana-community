import type { Status } from '@/components/projects/types'
import { CircleCheck, CircleDashed, CircleDot, CircleX } from '@/components/icons'
import { TASK_STATUSES } from '@mana/db/task-status'
import type { TFunction } from 'i18next'

const STATUS_KEY: Record<Status, string> = {
  todo: 'todo',
  'in-progress': 'inProgress',
  done: 'done',
  canceled: 'canceled',
}

export const TASK_STATUS_ICON = {
  todo: CircleDashed,
  'in-progress': CircleDot,
  done: CircleCheck,
  canceled: CircleX,
} satisfies Record<Status, typeof CircleDashed>

export function getTaskStatusFilterConfig(
  t: TFunction,
): { value: Status; label: string; color: string }[] {
  return TASK_STATUSES.map((value) => ({
    value,
    label: t(`taskStatus.${STATUS_KEY[value]}`),
    color:
      value === 'todo'
        ? 'var(--text-muted)'
        : value === 'in-progress'
          ? 'var(--primary)'
          : value === 'done'
            ? 'var(--primary)'
            : 'var(--danger)',
  }))
}

export const TASK_STATUS_BADGE_BG: Record<Status, string> = {
  todo: 'var(--surface-raised)',
  'in-progress': 'var(--primary-soft)',
  done: 'var(--primary-soft)',
  canceled: 'var(--danger-soft)',
}

export const TASK_STATUS_BADGE_FG: Record<Status, string> = {
  todo: 'var(--text-muted)',
  'in-progress': 'var(--primary)',
  done: 'var(--primary)',
  canceled: 'var(--danger)',
}

export const TASK_STATUS_PILL_CLASS: Record<Status, string> = {
  todo: 'border border-border bg-muted text-muted-foreground',
  'in-progress': 'border border-border bg-primary-soft text-primary',
  done: 'border border-border bg-primary-soft text-primary',
  canceled: 'border border-border bg-danger-soft text-danger',
}
