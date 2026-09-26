import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useStorage } from '@/context/storage'
import { UploadDropzone, type UploadDropzoneHandle } from '@/components/storage/upload-dropzone'
import { FileIcon } from '@/components/storage/file-icon'
import { FilePreviewModal } from '@/components/storage/file-preview-modal'
import type { StorageFile } from '@/components/storage/types'
import type { Contact } from '@/components/contacts/types'
import { ContactSection, ContactSectionHeader } from '@/components/contacts/contact-section'
import { formatUploadedAt } from '@/components/storage/uploaded-at'
import { formatBinaryBytes } from '@/lib/format-bytes'
import { cn } from '@/lib/utils'
import { ContactFilesTabSkeleton } from '@/components/contacts/contact-files-tab-skeleton'
import { StorageTrashConfirmDialog } from '@/components/storage/storage-trash-confirm-dialog'
import { useStorageFileTrashActions } from '@/hooks/use-storage-file-trash-actions'
import { useStorageUploadGuard } from '@/hooks/use-storage-upload-guard'
import { ChevronRight, Plus } from '@/components/icons'
import { useTranslation } from 'react-i18next'

const MAX_VISIBLE = 5

interface Props {
  contact: Contact
  className?: string
}

export function ContactFilesTab({ contact, className }: Props) {
  const { t } = useTranslation('contacts')
  const { t: tStorage } = useTranslation('storage')
  const { getEntityFolder, createEntityFolder, getEntityFiles, loading } = useStorage()
  const {
    pendingIds,
    trashing,
    requestTrash,
    cancelTrash,
    confirmTrash,
    primaryFileName,
  } = useStorageFileTrashActions()
  const { isFull, guardUpload } = useStorageUploadGuard()
  const [folderId, setFolderId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null)
  const dropzoneRef = useRef<UploadDropzoneHandle>(null)
  const creatingRef = useRef(false)

  useEffect(() => {
    if (loading) return
    const existing = getEntityFolder('contact', contact.id)
    if (existing) { setFolderId(existing.id); return }
    if (creatingRef.current) return
    creatingRef.current = true
    createEntityFolder('contact', contact.id, contact.name, contact.color)
      .then((f) => setFolderId(f.id))
      .catch(console.error)
      .finally(() => { creatingRef.current = false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, contact.id])

  const allFiles = getEntityFiles('contact', contact.id)
  const visible = allFiles.slice(0, MAX_VISIBLE)
  const hasMore = allFiles.length > MAX_VISIBLE

  if (loading || !folderId) return <ContactFilesTabSkeleton className={className} />

  return (
    <>
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDelete={(f) => requestTrash([f.id])}
      />
      <StorageTrashConfirmDialog
        open={pendingIds !== null}
        onOpenChange={(open) => { if (!open) cancelTrash() }}
        fileCount={pendingIds?.length ?? 0}
        primaryFileName={primaryFileName(allFiles)}
        onConfirm={() =>
          void confirmTrash((fileIds) => {
            if (previewFile && fileIds.includes(previewFile.id)) setPreviewFile(null)
          })
        }
        loading={trashing}
      />

      <UploadDropzone
        ref={dropzoneRef}
        folderId={folderId}
        roundedClassName="rounded-lg"
        className={cn('h-full min-w-0', className)}
      >
        <ContactSection className="h-full overflow-hidden">
          <ContactSectionHeader
            action={
              <button
                type="button"
                onClick={() => guardUpload(() => dropzoneRef.current?.open())}
                disabled={isFull}
                title={isFull ? tStorage('quotaFullTitle') : undefined}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-base hover:bg-surface-raised hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={13} strokeWidth={2} />
                {t('files.add')}
              </button>
            }
          >
            {t('files.title')}
            {allFiles.length > 0 && <span className="ml-1 opacity-60">{allFiles.length}</span>}
          </ContactSectionHeader>

          {visible.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t('files.noneYet')}</p>
          )}

          {visible.map((file, index) => (
            <div
              key={file.id}
              role="button"
              tabIndex={0}
              className={cn(
                'flex cursor-pointer items-center gap-3 border-border-subtle px-5 py-2.5 transition-colors duration-base hover:bg-surface-raised',
                index > 0 && 'border-t',
              )}
              onClick={() => setPreviewFile(file)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewFile(file) } }}
            >
              <FileIcon kind={file.kind} size={14} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBinaryBytes(file.sizeBytes)} · {formatUploadedAt(file.uploadedAt)}
                </p>
              </div>
            </div>
          ))}

          {hasMore && (
            <Link
              to="/storage/$folderId"
              params={{ folderId }}
              search={{ q: '', sort: 'name-asc', kind: 'all', tag: undefined }}
              className="flex w-full items-center justify-center gap-1.5 border-t border-border-subtle px-5 py-2.5 text-xs font-medium text-muted-foreground transition-colors duration-base hover:bg-surface-raised hover:text-foreground"
            >
              {t('files.seeAll', { count: allFiles.length })}
              <ChevronRight size={13} strokeWidth={2} />
            </Link>
          )}
        </ContactSection>
      </UploadDropzone>
    </>
  )
}
