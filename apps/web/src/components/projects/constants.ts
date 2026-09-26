import type { Priority, Status } from '@/components/projects/types'
import { TASK_STATUSES } from '@mana/db/task-status'
import { projectColorToHex } from '@/lib/project-color'

export const PRIORITY_COLOR: Record<Priority, string> = {
  high: 'var(--danger)',
  med: 'var(--primary)',
  low: 'var(--text-muted)',
}

export const PRIORITY_CHIP_ACTIVE: Record<
  Priority,
  { background: string; color: string; borderColor: string }
> = {
  high: {
    background: 'var(--danger-soft)',
    color: 'var(--danger)',
    borderColor: 'var(--danger)',
  },
  med: {
    background: 'var(--primary-soft)',
    color: 'var(--primary)',
    borderColor: 'var(--primary-border)',
  },
  low: {
    background: 'var(--accent-soft)',
    color: 'var(--text-muted)',
    borderColor: 'var(--accent-border)',
  },
}

export const TASK_PRIORITY_OPTIONS: { value: Priority; key: string }[] = [
  { value: 'high', key: 'high' },
  { value: 'med', key: 'med' },
  { value: 'low', key: 'low' },
]

export const PROJECT_COLORS = [
  'var(--primary)',
  'var(--category-purple)',
  'var(--warning)',
  'var(--danger)',
  'var(--category-green)',
  'var(--category-orange)',
]

export function nextUnusedProjectColor(usedColors: string[]): string {
  const used = new Set(usedColors.map(projectColorToHex))
  return (
    PROJECT_COLORS.find((c) => !used.has(projectColorToHex(c))) ??
    PROJECT_COLORS[usedColors.length % PROJECT_COLORS.length]
  )
}

export const STATUS_ORDER: Status[] = [...TASK_STATUSES]

export const NEW_PROJECT_DEFAULTS = {
  icon: '',
  objective: '',
  startDate: '',
  dueDate: '',
  description: '',
  archived: false,
  labels: [],
  contactId: null,
  contactName: '',
}

export const LABEL_COLORS = [
  'var(--danger)',
  'var(--warning)',
  'var(--primary)',
  'var(--category-purple)',
  'var(--category-green)',
  'var(--category-orange)',
  'var(--text-muted)',
  'var(--surface-overlay)',
]
