import { TaskActionsMenuContent } from '@/components/projects/task-actions-menu'
import type { Task } from '@/components/projects/types'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

export function TaskContextMenu({
  task,
  projectId,
  otherProjects,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onMoveTask,
  children,
}: {
  task: Task
  projectId: string
  otherProjects: { id: string; name: string }[]
  onUpdateTask: (taskId: string, patch: Partial<Task> & { labelIds?: string[] }) => void
  onDeleteTask: (taskId: string) => void
  onDuplicateTask: (taskId: string) => void
  onMoveTask: (taskId: string, targetProjectId: string) => void
  children: React.ReactNode
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <TaskActionsMenuContent
          root="context"
          task={task}
          projectId={projectId}
          otherProjects={otherProjects}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onDuplicateTask={onDuplicateTask}
          onMoveTask={onMoveTask}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}
