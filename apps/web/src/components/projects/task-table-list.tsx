import { TaskActionsMenuContent } from '@/components/projects/task-actions-menu'
import { TaskContextMenu } from '@/components/projects/task-context-menu'
import {
  InlineDueCompact,
  InlineMilestoneIcon,
  InlinePriorityIcon,
  InlineTagsCompact,
} from '@/components/projects/task-table-inline-cells'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { TaskStatusHeader } from '@/components/projects/task-status-header'
import { getTaskStatusFilterConfig } from '@/components/projects/status-styles'
import type { Milestone, Status, Task } from '@/components/projects/types'
import { AiBadge } from '@/components/ui/ai-badge'
import {
  coordinateGetter,
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
} from '@/components/ui/kanban'
import { cn } from '@/lib/utils'
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function TaskTableRow({
  task,
  milestones,
  projectId,
  otherProjects,
  onRowClick,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onMoveTask,
}: {
  task: Task
  milestones: Milestone[]
  projectId: string
  otherProjects: { id: string; name: string }[]
  onRowClick: (task: Task) => void
  onUpdateTask: (taskId: string, patch: Partial<Task> & { labelIds?: string[] }) => void
  onDeleteTask: (taskId: string) => void
  onDuplicateTask: (taskId: string) => void
  onMoveTask: (taskId: string, targetProjectId: string) => void
}) {
  const { t } = useTranslation('projects')

  return (
    <TaskContextMenu
      task={task}
      projectId={projectId}
      otherProjects={otherProjects}
      onUpdateTask={onUpdateTask}
      onDeleteTask={onDeleteTask}
      onDuplicateTask={onDuplicateTask}
      onMoveTask={onMoveTask}
    >
      <div
        onClick={() => onRowClick(task)}
        className="group flex cursor-pointer items-center transition-colors duration-fast hover:bg-surface-raised data-dragging:bg-surface-raised"
      >
        <div
          className="shrink-0 pl-1.5 xl:pl-3"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <InlinePriorityIcon
            task={task}
            onSelect={(priority) => onUpdateTask(task.id, { priority })}
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-2 xl:gap-2 xl:px-2">
          {task.aiAssigned && (
            <span className="hidden xl:inline">
              <AiBadge label={t('board.ai')} />
            </span>
          )}
          <span className="hidden w-12 shrink-0 text-right text-2xs tabular-nums text-muted-foreground/50 xl:inline">
            {task.displayId}
          </span>
          <span
            className="min-w-0 flex-1 truncate text-sm leading-snug text-foreground"
            style={task.status === 'done' ? { textDecoration: 'line-through', opacity: 0.55 } : undefined}
          >
            {task.title}
          </span>
        </div>

        <div
          className="flex shrink-0 items-center gap-0 pr-0.5 xl:gap-0.5 xl:pr-2"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="hidden items-center gap-0.5 xl:flex">
            <InlineTagsCompact
              task={task}
              onSave={(labels) =>
                onUpdateTask(task.id, { labels, labelIds: labels.map((l) => l.id) })
              }
            />
            <InlineMilestoneIcon
              task={task}
              milestones={milestones}
              onChange={(milestoneId) => onUpdateTask(task.id, { milestoneId })}
            />
            <InlineDueCompact task={task} onSave={(due) => onUpdateTask(task.id, { due })} />
          </div>
          <span className="hidden opacity-0 transition-opacity duration-fast xl:inline-flex xl:focus-within:opacity-100 xl:group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('taskMenu.taskActions')}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <TaskActionsMenuContent
                  root="dropdown"
                  task={task}
                  projectId={projectId}
                  otherProjects={otherProjects}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onDuplicateTask={onDuplicateTask}
                  onMoveTask={onMoveTask}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </div>
      </div>
    </TaskContextMenu>
  )
}

export function TaskTableList({
  tasks,
  milestones,
  statusOrder,
  projectId,
  otherProjects,
  onRowClick,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onMoveTask,
  onReorderTasks,
  columnsMap,
  onCreateTask,
  filterActive = false,
  emptyMessage,
}: {
  tasks: Task[]
  milestones: Milestone[]
  statusOrder: Status[]
  projectId: string
  otherProjects: { id: string; name: string }[]
  onRowClick: (task: Task) => void
  onUpdateTask: (taskId: string, patch: Partial<Task> & { labelIds?: string[] }) => void
  onDeleteTask: (taskId: string) => void
  onDuplicateTask: (taskId: string) => void
  onMoveTask: (taskId: string, targetProjectId: string) => void
  onReorderTasks?: (columns: Record<UniqueIdentifier, Task[]>) => void
  columnsMap?: Record<UniqueIdentifier, Task[]>
  onCreateTask?: (status: Status) => void
  filterActive?: boolean
  emptyMessage: string
}) {
  const { t } = useTranslation('projects')
  const statusConfig = getTaskStatusFilterConfig(t)
  const statusByValue = useMemo(
    () => new Map(statusConfig.map((s) => [s.value, s])),
    [statusConfig],
  )
  const [collapsed, setCollapsed] = useState<Set<Status>>(() => new Set())
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  )
  const canDrag = !filterActive && !!onReorderTasks && !!columnsMap

  const groups = useMemo(() => {
    const buckets = new Map<Status, Task[]>()
    for (const status of statusOrder) {
      buckets.set(status, [])
    }
    for (const task of tasks) {
      buckets.get(task.status)?.push(task)
    }
    return statusOrder
      .map((status) => ({
        status,
        tasks: buckets.get(status) ?? [],
      }))
      .filter((g) => g.tasks.length > 0)
  }, [tasks, statusOrder])

  function toggleGroup(status: Status) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  if ((filterActive && !tasks.length) || groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-3 py-5 text-center">
        <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
        {!filterActive && onCreateTask && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCreateTask(statusOrder[0] ?? 'todo')}
          >
            <Plus size={14} strokeWidth={2} />
            {t('board.addTask')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="list-shell">
      {canDrag ? (
        <Kanban
          value={columnsMap}
          onValueChange={onReorderTasks}
          getItemValue={(task) => task.id}
          sensors={sensors}
          flatCursor
        >
          <KanbanBoard className="!block !size-auto !gap-0">
            {groups.map(({ status, tasks: groupTasks }, groupIndex) => {
              const meta = statusByValue.get(status)
              const isCollapsed = collapsed.has(status)

              return (
                <div
                  key={status}
                  className={cn(groupIndex > 0 && 'border-t border-border-subtle')}
                >
                  <TaskStatusHeader
                    status={status}
                    label={meta?.label ?? status}
                    color={meta?.color ?? 'var(--text-muted)'}
                    count={groupTasks.length}
                    collapsed={isCollapsed}
                    onToggle={() => toggleGroup(status)}
                    onAdd={onCreateTask ? () => onCreateTask(status) : undefined}
                    showChevron
                    className="bg-surface-raised/40 px-2 py-2 xl:px-3"
                  />
                  <KanbanColumn
                    value={status}
                    disabled={isCollapsed}
                    className="!block !size-auto !gap-0 !rounded-none !border-0 !bg-transparent !p-0"
                  >
                    {!isCollapsed &&
                      groupTasks.map((task) => (
                        // touch-manipulation overrides the handle's touch-none:
                        // the TouchSensor activates on a 200ms delay, so the
                        // browser can keep the list scrollable until then.
                        <KanbanItem key={task.id} value={task.id} asHandle className="touch-manipulation !rounded-none">
                          <TaskTableRow
                            task={task}
                            milestones={milestones}
                            projectId={projectId}
                            otherProjects={otherProjects}
                            onRowClick={onRowClick}
                            onUpdateTask={onUpdateTask}
                            onDeleteTask={onDeleteTask}
                            onDuplicateTask={onDuplicateTask}
                            onMoveTask={onMoveTask}
                          />
                        </KanbanItem>
                      ))}
                  </KanbanColumn>
                </div>
              )
            })}
          </KanbanBoard>
        </Kanban>
      ) : (
        groups.map(({ status, tasks: groupTasks }, groupIndex) => {
          const meta = statusByValue.get(status)
          const isCollapsed = collapsed.has(status)

          return (
            <div
              key={status}
              className={cn(groupIndex > 0 && 'border-t border-border-subtle')}
            >
              <TaskStatusHeader
                status={status}
                label={meta?.label ?? status}
                color={meta?.color ?? 'var(--text-muted)'}
                count={groupTasks.length}
                collapsed={isCollapsed}
                onToggle={() => toggleGroup(status)}
                onAdd={onCreateTask ? () => onCreateTask(status) : undefined}
                showChevron
                className="bg-surface-raised/40 px-2 py-2 xl:px-3"
              />
              {!isCollapsed &&
                groupTasks.map((task) => (
                  <TaskTableRow
                    key={task.id}
                    task={task}
                    milestones={milestones}
                    projectId={projectId}
                    otherProjects={otherProjects}
                    onRowClick={onRowClick}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onDuplicateTask={onDuplicateTask}
                    onMoveTask={onMoveTask}
                  />
                ))}
            </div>
          )
        })
      )}
    </div>
  )
}
