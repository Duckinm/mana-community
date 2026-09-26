import type { UniqueIdentifier } from '@dnd-kit/core'
import type { ApiTaskPatchBody } from '@/lib/api-types'
import type { Project, Status, Task } from '@/components/projects/types'

export function addTask(projects: Project[], projectId: string, columnId: Status, task: Task): Project[] {
  return projects.map((p) =>
    p.id !== projectId ? p : {
      ...p,
      columns: p.columns.map((col) =>
        col.id !== columnId ? col : { ...col, tasks: [...col.tasks, task] },
      ),
    },
  )
}

export function updateTask(
  projects: Project[],
  projectId: string,
  taskId: string,
  patch: ApiTaskPatchBody,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const sourceCol = p.columns.find((col) => col.tasks.some((t) => t.id === taskId))
    if (!sourceCol) return p
    const task = sourceCol.tasks.find((t) => t.id === taskId)!
    const { labelIds: _labelIds, ...rest } = patch
    const updated: Task = {
      ...task,
      ...rest,
      // patch uses null to clear the body; the task shape uses undefined for "no body"
      body: rest.body === undefined ? task.body : (rest.body ?? undefined),
      status: (rest.status ?? task.status) as Status,
      priority: (rest.priority ?? task.priority) as Task['priority'],
    }
    // Same column: update in place so the card doesn't jump to the end and back
    // once the server refetch restores the real order.
    if (updated.status === sourceCol.id) {
      return {
        ...p,
        columns: p.columns.map((col) =>
          col.id !== sourceCol.id
            ? col
            : { ...col, tasks: col.tasks.map((t) => (t.id === taskId ? updated : t)) },
        ),
      }
    }
    return {
      ...p,
      columns: p.columns.map((col) => {
        if (col.id === sourceCol.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }
        }
        if (col.id === updated.status) return { ...col, tasks: [...col.tasks, updated] }
        return col
      }),
    }
  })
}

export function removeTask(projects: Project[], projectId: string, taskId: string): Project[] {
  return projects.map((p) =>
    p.id !== projectId ? p : {
      ...p,
      columns: p.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      })),
    },
  )
}

export function reorderColumns(
  projects: Project[],
  projectId: string,
  updated: Record<UniqueIdentifier, Task[]>,
): Project[] {
  return projects.map((p) =>
    p.id !== projectId ? p : {
      ...p,
      columns: p.columns.map((col) => ({
        ...col,
        tasks: (updated[col.id] ?? []).map((t) => ({ ...t, status: col.id as Status })),
      })),
    },
  )
}
