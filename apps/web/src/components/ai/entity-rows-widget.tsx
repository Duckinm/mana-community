import type { ChatUiOverlay } from '@/components/ai/chat-ui-action'
import type { DisplayRow } from '@/components/ai/chat-tool-result'
import { AiWidgetShell } from '@/components/ai/widgets/widget-shell'
import { FileText, FolderKanban, ListBullets, Package, User, Wallet } from '@/components/icons'
import { useProjects } from '@/context/projects'
import { useTranslation } from 'react-i18next'

const MAX_VISIBLE_ROWS = 8

const ENTITY_ICON: Record<DisplayRow['entity'], typeof User> = {
  contact: User,
  project: FolderKanban,
  document: FileText,
  task: ListBullets,
  transaction: Wallet,
  template: Package,
}

const ENTITY_LABEL_KEY: Record<DisplayRow['entity'], string> = {
  contact: 'widget.contacts',
  project: 'widget.projects',
  document: 'widget.documents',
  task: 'widget.tasks',
  transaction: 'widget.transactions',
  template: 'widget.templates',
}

const BADGE_COLOR: Record<string, string> = {
  overdue: 'var(--warning)',
  pending: 'var(--warning)',
  paid: 'var(--success)',
  done: 'var(--success)',
  completed: 'var(--success)',
  approved: 'var(--success)',
  canceled: 'var(--danger)',
  cancelled: 'var(--danger)',
}

const BADGE_COLOR_SOFT: Record<string, string> = {
  overdue: 'var(--warning-soft)',
  pending: 'var(--warning-soft)',
  paid: 'var(--success-soft)',
  done: 'var(--success-soft)',
  completed: 'var(--success-soft)',
  approved: 'var(--success-soft)',
  canceled: 'var(--danger-soft)',
  cancelled: 'var(--danger-soft)',
}

function BadgeChip({ badge }: { badge: string }) {
  const key = badge.toLowerCase()
  return (
    <span
      className="shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-medium capitalize"
      style={{
        color: BADGE_COLOR[key] ?? 'var(--muted-foreground)',
        background: BADGE_COLOR_SOFT[key] ?? 'var(--surface-raised)',
      }}
    >
      {badge.replace(/_/g, ' ')}
    </span>
  )
}

function findTaskProjectId(
  taskId: string,
  projects: { id: string; columns: { tasks: { id: string }[] }[] }[],
): string | undefined {
  for (const project of projects) {
    for (const column of project.columns) {
      if (column.tasks.some((task) => task.id === taskId)) return project.id
    }
  }
  return undefined
}

function rowOverlay(
  row: DisplayRow,
  projects: { id: string; columns: { tasks: { id: string }[] }[] }[],
): ChatUiOverlay | null {
  if (row.entity === 'template') return null
  if (row.entity === 'task') {
    const projectId = row.projectId ?? findTaskProjectId(row.id, projects)
    if (!projectId) return null
    return { entity: 'task', id: row.id, projectId }
  }
  return { entity: row.entity, id: row.id }
}

function EntityRow({ row, onOpen }: { row: DisplayRow; onOpen?: (overlay: ChatUiOverlay) => void }) {
  const { projects } = useProjects()
  const Icon = ENTITY_ICON[row.entity]
  const overlay = onOpen ? rowOverlay(row, projects) : null

  const content = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-muted-foreground">
        <Icon size={13} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{row.title}</p>
        {row.subtitle && <p className="truncate text-2xs text-caption">{row.subtitle}</p>}
      </div>
      {row.value && (
        <span className="shrink-0 text-sm font-medium font-mono tabular-nums text-foreground">{row.value}</span>
      )}
      {row.badge && <BadgeChip badge={row.badge} />}
    </div>
  )

  if (!overlay) {
    return <div className="rounded-lg px-1 py-1.5">{content}</div>
  }

  return (
    <button
      type="button"
      onClick={() => onOpen!(overlay)}
      className="w-full rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-accent"
    >
      {content}
    </button>
  )
}

interface Props {
  rows: DisplayRow[]
  onOpen?: (overlay: ChatUiOverlay) => void
}

export function EntityRowsWidget({ rows, onOpen }: Props) {
  const { t } = useTranslation('chat')
  if (rows.length === 0) return null

  const shown = rows.slice(0, MAX_VISIBLE_ROWS)
  const entity = rows[0]!.entity
  const Icon = ENTITY_ICON[entity]

  return (
    <AiWidgetShell icon={<Icon size={12} />} label={t(ENTITY_LABEL_KEY[entity], { count: rows.length })}>
      <ul className="space-y-0.5">
        {shown.map((row) => (
          <li key={`${row.entity}-${row.id}`}>
            <EntityRow row={row} onOpen={onOpen} />
          </li>
        ))}
      </ul>
      {rows.length > shown.length && (
        <p className="mt-1.5 px-1 text-2xs text-caption">{t('widget.andMore', { count: rows.length - shown.length })}</p>
      )}
    </AiWidgetShell>
  )
}
