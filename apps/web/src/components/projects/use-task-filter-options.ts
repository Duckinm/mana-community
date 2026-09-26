import { getTaskStatusFilterConfig } from '@/components/projects/status-styles'
import { type TaskFilter } from '@/components/projects/task-filter-matching'
import type { Priority } from '@/components/projects/types'
import { useLabels } from '@/hooks/use-labels'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const PRIORITY_CONFIG: { value: Priority; key: string }[] = [
  { value: 'high', key: 'high' },
  { value: 'med', key: 'med' },
  { value: 'low', key: 'low' },
]

const DUE_RANGES: { value: NonNullable<TaskFilter['due']>; key: string }[] = [
  { value: 'overdue', key: 'dueOverdue' },
  { value: 'today', key: 'dueToday' },
  { value: 'week', key: 'dueWeek' },
  { value: 'month', key: 'dueMonth' },
]

const CREATED_RANGES: { value: NonNullable<TaskFilter['created']>; key: string }[] = [
  { value: 'today', key: 'createdToday' },
  { value: 'week', key: 'createdWeek' },
  { value: 'month', key: 'createdMonth' },
]

export function useTaskFilterOptions(filter: TaskFilter, onChange: (filter: TaskFilter) => void) {
  const { t } = useTranslation('projects')
  const { labels: allLabels } = useLabels()
  const statusConfig = getTaskStatusFilterConfig(t)
  const priorityOptions = PRIORITY_CONFIG.map((priority) => ({
    value: priority.value,
    label: t(`priority.${priority.key}`),
  }))
  const dueRangeOptions = DUE_RANGES.map((range) => ({
    value: range.value,
    label: t(`filterBar.${range.key}`),
  }))
  const createdRangeOptions = CREATED_RANGES.map((range) => ({
    value: range.value,
    label: t(`filterBar.${range.key}`),
  }))
  const toggle = useCallback(<K extends keyof TaskFilter>(
    key: K,
    value: TaskFilter[K] extends unknown[] ? TaskFilter[K][number] : never,
  ) => {
    const current = filter[key] as unknown[]
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]
    onChange({ ...filter, [key]: next })
  }, [filter, onChange])

  return { t, allLabels, statusConfig, priorityOptions, dueRangeOptions, createdRangeOptions, toggle }
}
