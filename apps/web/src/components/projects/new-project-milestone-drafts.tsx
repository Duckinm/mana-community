import { DatePicker } from '@/components/ui/date-picker'
import { MilestoneDiamond } from '@/components/icons/milestone-diamond'
import type { NewProjectMilestoneDraft } from '@/components/projects/new-project-types'
import { Plus, Trash2 } from '@/components/icons'
import { formatCalendarDate, parseCalendarDate } from '@/lib/calendar-date'
import { randomId } from '@/lib/random-id'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

function MilestoneTimelinePreview({ milestones }: { milestones: NewProjectMilestoneDraft[] }) {
  const dated = milestones
    .flatMap((m) => {
      const date = parseCalendarDate(m.dueDate)
      return date ? [{ id: m.id, name: m.name, dueDate: m.dueDate, time: date.getTime() }] : []
    })
    .sort((a, b) => a.time - b.time)

  if (dated.length < 2) return null

  const min = dated[0].time
  const span = dated[dated.length - 1].time - min

  return (
    <div className="border-t border-border-subtle px-2.5 py-1.5">
      <div className="relative mx-1 h-4">
        <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-border-default" />
        {dated.map((m) => (
          <span
            key={m.id}
            title={`${m.name} — ${formatCalendarDate(m.dueDate, 'MMM d')}`}
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: `${span === 0 ? 50 : ((m.time - min) / span) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-2xs text-muted-foreground">
        <span>{formatCalendarDate(dated[0].dueDate, 'MMM d')}</span>
        <span>{formatCalendarDate(dated[dated.length - 1].dueDate, 'MMM d')}</span>
      </div>
    </div>
  )
}

export function NewProjectMilestoneDrafts({
  milestones,
  onChange,
  showEmptyErrors = false,
}: {
  milestones: NewProjectMilestoneDraft[]
  onChange: (milestones: NewProjectMilestoneDraft[]) => void
  showEmptyErrors?: boolean
}) {
  const { t } = useTranslation('projects')

  function addMilestone() {
    onChange([
      ...milestones,
      { id: randomId(), name: '', dueDate: undefined },
    ])
  }

  function updateMilestone(id: string, patch: Partial<NewProjectMilestoneDraft>) {
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function removeMilestone(id: string) {
    onChange(milestones.filter((m) => m.id !== id))
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-raised/40">
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-2.5 py-1.5',
          milestones.length > 0 && 'border-b border-border-subtle',
        )}
      >
        <span className="text-xs font-medium text-foreground">{t('newProject.milestones')}</span>
        <button
          type="button"
          onClick={addMilestone}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          aria-label={t('newProject.addMilestone')}
        >
          <Plus size={12} strokeWidth={2} />
        </button>
      </div>

      {milestones.length > 0 && (
        <ul className="divide-y divide-border-subtle">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="flex items-center gap-1.5 px-2.5 py-1.5">
              <MilestoneDiamond size={12} strokeWidth={2} className="shrink-0 text-muted-foreground" />
              <input
                value={milestone.name}
                onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })}
                placeholder={t('milestones.namePlaceholder')}
                className={cn(
                  'min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground',
                  showEmptyErrors && !milestone.name.trim() && 'placeholder:text-danger',
                )}
              />
              <DatePicker
                size="sm"
                clearable
                align="end"
                value={milestone.dueDate ?? null}
                onChange={(value) => updateMilestone(milestone.id, { dueDate: value ?? undefined })}
                placeholder={t('newProject.milestoneDueDate')}
                className="h-7 w-auto shrink-0 border-border-subtle bg-surface-input text-2xs text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => removeMilestone(milestone.id)}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                aria-label={t('newProject.removeMilestone')}
              >
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <MilestoneTimelinePreview milestones={milestones} />
    </div>
  )
}
