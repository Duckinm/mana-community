import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ChevronRight, MoreHorizontal, Pencil, Plus, Trash2 } from '@/components/icons'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { MilestoneDiamond } from '@/components/icons/milestone-diamond'
import { MilestoneDescriptionEditor } from '@/components/projects/milestone-description-editor'
import { MilestonesPanelSkeleton } from '@/components/projects/milestones-panel-skeleton'
import type { Milestone } from '@/components/projects/types'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { menuItemDestructive } from '@/components/ui/menu-styles'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMilestones } from '@/hooks/use-milestones'
import { formatCalendarDate, parseCalendarDate, toCalendarDateString } from '@/lib/calendar-date'
import { cn } from '@/lib/utils'

import { milestoneDiamondClass } from '@/components/projects/milestone-styles'

function MilestoneRow({
  projectId,
  milestone,
  onPatch,
  onDeleteRequest,
}: {
  projectId: string
  milestone: Milestone
  onPatch: (patch: Partial<Pick<Milestone, 'name' | 'dueDate' | 'description'>>) => void
  onDeleteRequest: () => void
}) {
  const { t } = useTranslation('projects')
  const [expanded, setExpanded] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  function saveName(value: string) {
    const trimmed = value.trim()
    setEditingName(false)
    if (trimmed && trimmed !== milestone.name) onPatch({ name: trimmed })
  }

  return (
    <div className="group/row">
      <div className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-raised">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <MilestoneDiamond
            size={14}
            strokeWidth={2}
            className={milestoneDiamondClass(milestone)}
          />
          {editingName ? (
            <input
              autoFocus
              defaultValue={milestone.name}
              onBlur={(e) => saveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setEditingName(false)
              }}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
            />
          ) : (
            <span
              className="truncate text-sm font-medium text-foreground"
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditingName(true)
              }}
            >
              {milestone.name}
            </span>
          )}
          <ChevronRight
            size={13}
            strokeWidth={2}
            className={cn(
              'shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
            )}
          />
        </button>

        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              {milestone.dueDate ? (
                <button type="button" className="transition-colors hover:text-foreground">
                  {formatCalendarDate(milestone.dueDate)}
                </button>
              ) : (
                <button
                  type="button"
                  className="opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
                >
                  {t('milestones.setTargetDate')}
                </button>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto overflow-hidden p-0">
              <Calendar
                mode="single"
                selected={parseCalendarDate(milestone.dueDate) ?? undefined}
                onSelect={(date) => {
                  setDatePickerOpen(false)
                  if (date) onPatch({ dueDate: toCalendarDateString(date) })
                }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          <Link
            to="/projects/$projectId/issues"
            params={{ projectId }}
            search={{
              statuses: [],
              priorities: [],
              tags: [],
              due: null,
              created: null,
              milestone: milestone.id,
            }}
            className="tabular-nums transition-colors hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {t('milestones.issues', { count: milestone.taskCount })}
          </Link>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{milestone.completionPercent}%</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden h-6 w-6 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-surface-overlay hover:text-foreground data-[state=open]:bg-surface-overlay data-[state=open]:text-foreground xl:flex"
                aria-label={t('milestones.actionsAria')}
              >
                <MoreHorizontal size={15} strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setExpanded(true)
                  setEditingName(true)
                }}
              >
                <Pencil size={12} />
                {t('milestones.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemDestructive}
                onSelect={onDeleteRequest}
              >
                <Trash2 size={12} />
                {t('milestones.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded && (
        <div className="pb-3 pl-6 pr-2 pt-1">
          <MilestoneDescriptionEditor
            milestoneId={milestone.id}
            description={milestone.description}
            onChange={(description) => onPatch({ description })}
          />
        </div>
      )}
    </div>
  )
}

function MilestoneDraft({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation('projects')

  return (
    <div className="-mx-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5">
      <MilestoneDiamond size={14} strokeWidth={2} className="shrink-0 text-muted-foreground" />
      <input
        autoFocus
        placeholder={t('milestones.namePlaceholder')}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v) onCreate(v)
          else onCancel()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') onCancel()
        }}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

export function MilestonesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const { milestones, isLoading, createMilestone, updateMilestone, deleteMilestone } =
    useMilestones(projectId)
  const [drafting, setDrafting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (isLoading) return <MilestonesPanelSkeleton />

  async function handleCreate(name: string) {
    setDrafting(false)
    await createMilestone({ name })
  }

  async function handlePatch(
    id: string,
    patch: Partial<Pick<Milestone, 'name' | 'dueDate' | 'description'>>,
  ) {
    await updateMilestone({ id, patch })
  }

  async function handleDelete(id: string) {
    await deleteMilestone(id)
  }

  return (
    <div className="mt-6">
      <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('milestones.title')}
      </p>

      <div className="space-y-0.5">
        {milestones.map((m) => (
          <MilestoneRow
            key={m.id}
            projectId={projectId}
            milestone={m}
            onPatch={(patch) => handlePatch(m.id, patch)}
            onDeleteRequest={() => setDeleteId(m.id)}
          />
        ))}

        {drafting && (
          <MilestoneDraft onCreate={handleCreate} onCancel={() => setDrafting(false)} />
        )}
      </div>

      <button
        type="button"
        onClick={() => setDrafting(true)}
        className="-mx-2 mt-2 flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus size={14} strokeWidth={2} />
        {t('milestones.addButton')}
      </button>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title={t('milestones.deleteConfirmTitle')}
        description={t('milestones.deleteConfirmDescription')}
        onConfirm={() => {
          if (deleteId) void handleDelete(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
