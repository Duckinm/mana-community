import { parseDueValue } from '@/components/projects/due-helpers'
import type { Priority, Status, Task } from '@/components/projects/types'

export interface TaskFilter {
  statuses: Status[]
  priorities: Priority[]
  tags: string[]
  due: 'overdue' | 'today' | 'week' | 'month' | null
  created: 'today' | 'week' | 'month' | null
  milestone: string | null
}

export const EMPTY_FILTER: TaskFilter = {
  statuses: [],
  priorities: [],
  tags: [],
  due: null,
  created: null,
  milestone: null,
}

export function isFilterActive(f: TaskFilter): boolean {
  return (
    f.statuses.length > 0 ||
    f.priorities.length > 0 ||
    f.tags.length > 0 ||
    f.due != null ||
    f.created != null ||
    f.milestone != null
  )
}

function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function taskMatchesStatusPriorityTags(task: Task, f: TaskFilter): boolean {
  if (f.statuses.length > 0 && !f.statuses.includes(task.status)) return false
  if (f.priorities.length > 0 && !f.priorities.includes(task.priority)) return false
  if (f.tags.length > 0 && !f.tags.some((id) => task.labels.some((l) => l.id === id))) return false
  return true
}

function taskMatchesDueDimension(task: Task, dueFilter: NonNullable<TaskFilter['due']>): boolean {
  const due = parseDueValue(task.due)
  if (!due) return false
  const today = startOfToday()
  if (dueFilter === 'overdue') return due < today
  if (dueFilter === 'today') return due.toDateString() === today.toDateString()
  if (dueFilter === 'week') {
    const end = new Date(today)
    end.setDate(today.getDate() + 7)
    return due >= today && due <= end
  }
  const end = new Date(today)
  end.setMonth(today.getMonth() + 1)
  return due >= today && due <= end
}

function taskMatchesCreatedDimension(
  task: Task,
  createdFilter: NonNullable<TaskFilter['created']>,
): boolean {
  if (!task.createdAt) return false
  const created = new Date(task.createdAt)
  created.setHours(0, 0, 0, 0)
  const today = startOfToday()
  if (createdFilter === 'today') return created.toDateString() === today.toDateString()
  if (createdFilter === 'week') {
    const start = new Date(today)
    start.setDate(today.getDate() - 7)
    return created >= start
  }
  const start = new Date(today)
  start.setMonth(today.getMonth() - 1)
  return created >= start
}

/** Returns true if the task passes every active filter dimension. */
export function taskMatchesFilter(task: Task, f: TaskFilter): boolean {
  if (!isFilterActive(f)) return true
  if (f.milestone && task.milestoneId !== f.milestone) return false
  if (!taskMatchesStatusPriorityTags(task, f)) return false
  if (f.due && !taskMatchesDueDimension(task, f.due)) return false
  if (f.created && !taskMatchesCreatedDimension(task, f.created)) return false
  return true
}

export function applyFilter(tasks: Task[], f: TaskFilter): Task[] {
  if (!isFilterActive(f)) return tasks
  return tasks.filter((t) => taskMatchesFilter(t, f))
}
