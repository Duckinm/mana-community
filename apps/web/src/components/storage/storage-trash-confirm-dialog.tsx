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
import { STORAGE_TRASH_RETENTION_DAYS } from '@/lib/storage-trash'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileCount: number
  primaryFileName?: string
  onConfirm: () => void
  loading?: boolean
}

export function StorageTrashConfirmDialog({
  open,
  onOpenChange,
  fileCount,
  primaryFileName,
  onConfirm,
  loading = false,
}: Props) {
  const title =
    fileCount === 1
      ? `Move "${primaryFileName ?? 'this file'}" to trash?`
      : `Move ${fileCount} files to trash?`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Files stay in trash for {STORAGE_TRASH_RETENTION_DAYS} days before
            being permanently deleted. You can restore them from trash or undo
            right after moving.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Moving…' : 'Move to trash'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
