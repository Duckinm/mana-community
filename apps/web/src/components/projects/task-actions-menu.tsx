import { TASK_PRIORITY_OPTIONS } from '@/components/projects/constants'
import {
  formatDueLabel,
  formatTaskDueDisplay,
  getTaskDuePresetDate,
  isSameDueDay,
  parseDueValue,
  TASK_DUE_PRESET_KEYS,
  type TaskDuePresetKey,
} from '@/components/projects/due-helpers'
import { getTaskStatusFilterConfig } from '@/components/projects/status-styles'
import { TaskLabelsMenuSub } from '@/components/projects/task-labels-menu-sub'
import type { Priority, Task } from '@/components/projects/types'
import {
  Archive,
  ArchiveRestore,
  Calendar,
  CircleDot,
  Copy,
  Flag,
  Folder,
  Link,
  Trash2,
  X,
} from '@/components/icons'
import { MilestoneDiamond } from '@/components/icons/milestone-diamond'
import { useMilestones } from '@/hooks/use-milestones'
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { menuItemDestructive } from '@/components/ui/menu-styles'
import { MenuItemRow } from '@/components/ui/menu-item-row'
import { useTranslation } from 'react-i18next'

export function TaskActionsMenuContent({
  root,
  task,
  projectId,
  otherProjects,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onMoveTask,
}: {
  root: 'dropdown' | 'context'
  task: Task
  projectId: string
  otherProjects: { id: string; name: string }[]
  onUpdateTask: (taskId: string, patch: Partial<Task> & { labelIds?: string[] }) => void
  onDeleteTask: (taskId: string) => void
  onDuplicateTask: (taskId: string) => void
  onMoveTask: (taskId: string, targetProjectId: string) => void
}) {
  const { t, i18n } = useTranslation('projects')
  const duePresetDatePattern = i18n.language === 'th' ? 'EEE d MMM' : 'EEE, d MMM'
  const statusConfig = getTaskStatusFilterConfig(t)
  const Sub = root === 'dropdown' ? DropdownMenuSub : ContextMenuSub
  const SubTrigger = root === 'dropdown' ? DropdownMenuSubTrigger : ContextMenuSubTrigger
  const SubContent = root === 'dropdown' ? DropdownMenuSubContent : ContextMenuSubContent
  const Item = root === 'dropdown' ? DropdownMenuItem : ContextMenuItem
  const Sep = root === 'dropdown' ? DropdownMenuSeparator : ContextMenuSeparator
  const { milestones } = useMilestones(projectId)

  return (
    <>
      <Sub>
        <SubTrigger>
          <CircleDot size={14} strokeWidth={1.75} />
          {t('taskMenu.status')}
        </SubTrigger>
        <SubContent>
          {statusConfig.map(({ value, label, color }) => {
            const active = task.status === value
            return (
              <Item key={value} onSelect={() => onUpdateTask(task.id, { status: value })}>
                <MenuItemRow active={active}>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  {label}
                </MenuItemRow>
              </Item>
            )
          })}
        </SubContent>
      </Sub>

      <Sub>
        <SubTrigger>
          <Flag size={14} strokeWidth={1.75} />
          {t('taskMenu.priority')}
        </SubTrigger>
        <SubContent>
          {TASK_PRIORITY_OPTIONS.map(({ value, key }) => {
            const active = task.priority === value
            return (
              <Item
                key={value}
                onSelect={() => onUpdateTask(task.id, { priority: value as Priority })}
              >
                <MenuItemRow active={active}>
                  {t(`priority.${key}`)}
                </MenuItemRow>
              </Item>
            )
          })}
        </SubContent>
      </Sub>

      <TaskLabelsMenuSub
        root={root}
        selected={task.labels}
        onChange={(labels) =>
          onUpdateTask(task.id, { labels, labelIds: labels.map((l) => l.id) })
        }
      />

      <Sub>
        <SubTrigger>
          <Calendar size={14} strokeWidth={1.75} />
          {t('taskMenu.setDueDate')}
        </SubTrigger>
        <SubContent className="min-w-[260px]">
          {TASK_DUE_PRESET_KEYS.map((key) => {
            const date = getTaskDuePresetDate(key)
            const active = isSameDueDay(parseDueValue(task.due), date)
            const labelKey = {
              tomorrow: 'dueTomorrow',
              endOfWeek: 'dueEndOfWeek',
              inOneWeek: 'dueInOneWeek',
              endOfNextCycle: 'dueEndOfNextCycle',
            } satisfies Record<TaskDuePresetKey, string>
            return (
              <Item
                key={key}
                onSelect={() => onUpdateTask(task.id, { due: formatDueLabel(date) })}
              >
                <MenuItemRow
                  active={active}
                  end={
                    <span className="tabular-nums text-muted-foreground">
                      {formatTaskDueDisplay(date, duePresetDatePattern)}
                    </span>
                  }
                >
                  <Calendar size={14} strokeWidth={1.75} className="text-muted-foreground" />
                  {t(`taskMenu.${labelKey[key]}`)}
                </MenuItemRow>
              </Item>
            )
          })}
          {task.due && (
            <>
              <Sep />
              <Item
                className="text-muted-foreground"
                onSelect={() => onUpdateTask(task.id, { due: null })}
              >
                <X size={14} strokeWidth={1.75} />
                {t('taskMenu.clearDueDate')}
              </Item>
            </>
          )}
        </SubContent>
      </Sub>

      <Sub>
        <SubTrigger>
          <MilestoneDiamond size={14} strokeWidth={1.75} />
          {t('taskMenu.milestone')}
        </SubTrigger>
        <SubContent className="max-h-[min(320px,50vh)] overflow-y-auto">
          <Item onSelect={() => onUpdateTask(task.id, { milestoneId: null })}>
            <MenuItemRow active={!task.milestoneId}>
              {t('taskDetail.noMilestone')}
            </MenuItemRow>
          </Item>
          {milestones.map((m) => {
            const active = task.milestoneId === m.id
            return (
              <Item key={m.id} onSelect={() => onUpdateTask(task.id, { milestoneId: m.id })}>
                <MenuItemRow active={active}>
                  <span className="truncate">{m.name}</span>
                </MenuItemRow>
              </Item>
            )
          })}
        </SubContent>
      </Sub>

      <Sep />

      <Item onSelect={() => onDuplicateTask(task.id)}>
        <Copy size={14} strokeWidth={1.75} />
        {t('taskMenu.duplicate')}
      </Item>

      <Item
        onSelect={() => {
          void navigator.clipboard.writeText(
            `${window.location.origin}/projects/${projectId}/issues/${task.id}`,
          )
        }}
      >
        <Link size={14} strokeWidth={1.75} />
        {t('taskMenu.copyLink')}
      </Item>

      {otherProjects.length > 0 && (
        <Sub>
          <SubTrigger>
            <Folder size={14} strokeWidth={1.75} />
            {t('taskMenu.moveTo')}
          </SubTrigger>
          <SubContent className="max-h-[min(320px,50vh)] overflow-y-auto">
            {otherProjects.map((p) => (
              <Item key={p.id} onSelect={() => onMoveTask(task.id, p.id)}>
                <span className="truncate">{p.name}</span>
              </Item>
            ))}
          </SubContent>
        </Sub>
      )}

      {task.status !== 'canceled' ? (
        <Item onSelect={() => onUpdateTask(task.id, { status: 'canceled' })}>
          <Archive size={14} strokeWidth={1.75} />
          {t('taskMenu.archive')}
        </Item>
      ) : (
        <Item
          className="text-primary focus:text-primary"
          onSelect={() => onUpdateTask(task.id, { status: 'todo' })}
        >
          <ArchiveRestore size={14} strokeWidth={1.75} />
          {t('taskMenu.restore')}
        </Item>
      )}

      <Sep />

      <Item
        className={menuItemDestructive}
        onSelect={() => onDeleteTask(task.id)}
      >
        <Trash2 size={14} strokeWidth={1.75} />
        {t('taskMenu.deleteTask')}
      </Item>
    </>
  )
}
