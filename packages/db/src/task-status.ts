export const TASK_STATUSES = ['todo', 'in-progress', 'done', 'canceled'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const DEFAULT_TASK_STATUS: TaskStatus = 'todo'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  'in-progress': 'In Progress',
  done: 'Done',
  canceled: 'Canceled',
}

export function parseTaskStatus(status: string): TaskStatus {
  if ((TASK_STATUSES as readonly string[]).includes(status)) return status as TaskStatus
  throw new Error(`Invalid task status: ${status}`)
}
