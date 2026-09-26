export type { TaskStatus as Status } from '@mana/db/task-status'
export { TASK_STATUSES, DEFAULT_TASK_STATUS } from '@mana/db/task-status'

import type { ApiLabel, ApiMilestone, ApiProject, ApiTask } from '@/lib/api-types'
import type { TiptapDoc } from '@/lib/rich-text'

export type SortKey = 'title' | 'status' | 'priority' | 'due' | 'tag'
export type Priority = 'high' | 'med' | 'low'
export type ViewTab = 'overview' | 'reports' | 'issues'

export type Label = ApiLabel
export type Task = ApiTask
export type Milestone = ApiMilestone
export type Project = ApiProject

/** Task PATCH shape — `body: null` clears the rich-text body (the Task shape itself uses undefined). */
export type TaskPatch = Partial<Omit<Task, 'body'>> & { labelIds?: string[]; body?: TiptapDoc | null }
