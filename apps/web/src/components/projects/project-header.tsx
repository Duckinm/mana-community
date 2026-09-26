import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Archive,
  ArchiveRestore,
  Copy,
  FileText,
  Link as LinkIcon,
  MoreHorizontal,
  Trash2,
} from '@/components/icons'
import type { Project } from '@/components/projects/types'
import { ColorEmojiPicker } from '@/components/projects/color-emoji-picker'
import { tiptapDocToText } from '@/lib/rich-text'
import { Button } from '@/components/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { menuItemDestructive } from '@/components/ui/menu-styles'

function InlineText({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string
  onCommit: (next: string) => void
  placeholder: string
  className: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    setEditing(false)
    const next = draft.trim()
    if (next !== value) onCommit(next)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        placeholder={placeholder}
        className={`${className} -mx-1 w-[calc(100%+0.5rem)] rounded-md bg-transparent px-1 outline-none`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      className={`${className} text-left rounded-md transition-colors hover:bg-surface-raised -mx-1 px-1`}
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </button>
  )
}

export function ProjectHeader({
  project,
  onUpdate,
  onArchiveToggle,
  onDuplicate,
  onDelete,
}: {
  project: Project
  onUpdate: (patch: Partial<Project>) => void
  onArchiveToggle: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('projects')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const projectUrl = `${window.location.origin}/projects/${project.id}/overview`

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text)
    toast.success(label)
  }

  function copyOverviewAsMarkdown() {
    const lines = [`# ${project.name}`]
    if (project.objective) lines.push('', project.objective)
    const description = tiptapDocToText(project.description)
    if (description) lines.push('', description)
    copy(lines.join('\n'), t('header.overviewCopiedMarkdown'))
  }

  return (
    <div className="flex items-center gap-3">
      <ColorEmojiPicker
        icon={project.icon}
        color={project.color}
        name={project.name}
        onIconChange={(icon) => onUpdate({ icon })}
        onColorChange={(color) => onUpdate({ color })}
      />

      <div className="flex-1 min-w-0">
        <InlineText
          value={project.name}
          onCommit={(name) => name && onUpdate({ name })}
          placeholder={t('header.projectNamePlaceholder')}
          className="text-lg font-semibold text-foreground tracking-tight block"
        />
        <InlineText
          value={project.objective}
          onCommit={(objective) => onUpdate({ objective })}
          placeholder={t('header.objectivePlaceholder')}
          className="text-sm text-muted-foreground block mt-0.5"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('header.projectActions')}>
            <MoreHorizontal size={15} strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LinkIcon size={13} strokeWidth={2} />
              {t('header.copy')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[208px]">
              <DropdownMenuItem
                onSelect={() => copy(projectUrl, t('header.urlCopied'))}
              >
                <LinkIcon size={13} strokeWidth={2} />
                {t('header.copyUrl')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => copy(project.name, t('header.titleCopied'))}
              >
                <Copy size={13} strokeWidth={2} />
                {t('header.copyTitle')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => copy(`[${project.name}](${projectUrl})`, t('header.titleLinkCopied'))}
              >
                <LinkIcon size={13} strokeWidth={2} />
                {t('header.copyTitleAsLink')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={copyOverviewAsMarkdown}>
                <FileText size={13} strokeWidth={2} />
                {t('header.copyOverviewAsMarkdown')}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy size={13} strokeWidth={2} />
            {t('header.duplicate')}
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={onArchiveToggle}>
            {project.archived ? (
              <ArchiveRestore size={13} strokeWidth={2} />
            ) : (
              <Archive size={13} strokeWidth={2} />
            )}
            {project.archived ? t('header.unarchive') : t('header.archive')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className={menuItemDestructive}
            onSelect={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} strokeWidth={2} />
            {t('header.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('header.deleteTitle', { name: project.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('header.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('header.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void onDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('header.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
