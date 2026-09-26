import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, X } from '@/components/icons'
import { LABEL_COLORS } from '@/components/projects/constants'
import type { Label } from '@/components/projects/types'
import { useLabels } from '@/hooks/use-labels'
import { LabelsPanelSkeleton } from '@/components/settings/labels-panel-skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function ColorSwatchGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap p-1">
      {LABEL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{
            background: c,
            boxShadow: value === c ? `0 0 0 2px var(--surface-overlay), 0 0 0 3px ${c}` : 'none',
          }}
        >
          {value === c && <Check size={9} className="text-primary-foreground" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}

function EditableLabelChip({
  label,
  onRename,
  onRecolor,
  onDelete,
}: {
  label: Label
  onRename: (name: string) => void
  onRecolor: (color: string) => void
  onDelete: () => void
}) {
  const { t } = useTranslation('settings')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(label.name)
  const [colorOpen, setColorOpen] = useState(false)

  function commit() {
    setEditing(false)
    const trimmed = name.trim()
    if (trimmed && trimmed !== label.name) onRename(trimmed)
    else setName(label.name)
  }

  return (
    <div className="group inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-card pl-1 pr-1.5 py-1">
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-3.5 h-3.5 rounded-full shrink-0 transition-transform hover:scale-110"
            style={{ background: label.color }}
            aria-label={t('labels.changeColor')}
          />
        </PopoverTrigger>
        <PopoverContent align="start">
          <ColorSwatchGrid
            value={label.color}
            onChange={(c) => {
              onRecolor(c)
              setColorOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setName(label.name)
              setEditing(false)
            }
          }}
          className="bg-transparent text-xs text-foreground outline-none w-24"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          className="text-xs font-medium truncate max-w-[140px]"
          style={{ color: label.color }}
        >
          {label.name}
        </button>
      )}

      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-surface-raised transition-colors"
          aria-label={t('labels.edit')}
        >
          <Pencil size={10} className="text-foreground opacity-50" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-red-500/20 transition-colors"
          aria-label={t('labels.delete')}
        >
          <X size={10} className="text-destructive" />
        </button>
      </div>
    </div>
  )
}

function AddLabelChip({ onCreate }: { onCreate: (name: string, color: string) => Promise<void> }) {
  const { t } = useTranslation('settings')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0])
  const [colorOpen, setColorOpen] = useState(false)

  function reset() {
    setAdding(false)
    setName('')
    setColor(LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)])
  }

  async function commit() {
    const trimmed = name.trim()
    if (!trimmed) {
      reset()
      return
    }
    await onCreate(trimmed, color)
    reset()
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-border-subtle px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-card hover:text-foreground"
      >
        <Plus size={11} strokeWidth={2} />
        {t('labels.add')}
      </button>
    )
  }

  return (
    <div className="group inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-card pl-1 pr-1.5 py-1">
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-3.5 h-3.5 rounded-full shrink-0 transition-transform hover:scale-110"
            style={{ background: color }}
            aria-label={t('labels.changeColor')}
          />
        </PopoverTrigger>
        <PopoverContent align="start">
          <ColorSwatchGrid value={color} onChange={(c) => { setColor(c); setColorOpen(false) }} />
        </PopoverContent>
      </Popover>

      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') reset()
        }}
        placeholder={t('labels.namePlaceholder')}
        className="bg-transparent text-xs text-foreground outline-none w-24 placeholder:text-muted-foreground"
      />
    </div>
  )
}

export function LabelsPanel() {
  const { t } = useTranslation('settings')
  const { labels, isLoading, createLabel, updateLabel, deleteLabel } = useLabels()
  const [deleteTarget, setDeleteTarget] = useState<Label | null>(null)

  async function handleCreate(name: string, color: string) {
    await createLabel({ name, color })
  }

  async function handleRename(id: string, name: string) {
    await updateLabel({ id, patch: { name } })
  }

  async function handleRecolor(id: string, c: string) {
    await updateLabel({ id, patch: { color: c } })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteLabel(deleteTarget.id)
    } finally {
      setDeleteTarget(null)
    }
  }

  if (isLoading) return <LabelsPanelSkeleton />

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        {t('labels.description')}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-5 max-h-56 overflow-y-auto p-0.5">
        {labels.map((lbl) => (
          <EditableLabelChip
            key={lbl.id}
            label={lbl}
            onRename={(name) => handleRename(lbl.id, name)}
            onRecolor={(c) => handleRecolor(lbl.id, c)}
            onDelete={() => setDeleteTarget(lbl)}
          />
        ))}
        <AddLabelChip onCreate={handleCreate} />
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('labels.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t('labels.deleteDescription', { name: deleteTarget.name }) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('labels.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
