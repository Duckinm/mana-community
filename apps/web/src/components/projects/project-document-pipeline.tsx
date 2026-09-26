import { DOCUMENT_TYPE_KEYS } from '@/components/documents/constants'
import { DocumentStatusIcon } from '@/components/documents/document-status-icon'
import type { Document, DocumentType } from '@/components/documents/types'
import { isDocumentActive } from '@/lib/document-helpers'
import { dueDateMeta, STAGE_ORDER } from '@/components/projects/project-billing-helpers'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, FileText, Receipt, ScrollText } from '@/components/icons'
import { useTranslation } from 'react-i18next'

const STAGE_ICONS: Record<DocumentType, typeof FileText> = {
  QO: ScrollText,
  INV: FileText,
  RC: Receipt,
}

function Stage({
  type,
  docs,
  projectId,
  isLast,
}: {
  type: DocumentType
  docs: Document[]
  projectId: string
  isLast: boolean
}) {
  const { t } = useTranslation('projects')
  const Icon = STAGE_ICONS[type]
  const complete = docs.some((d) => d.status !== 'draft')
  const drafts = docs.filter((d) => d.status === 'draft').length

  return (
    <div className={cn('flex flex-col gap-3 px-1 py-1 sm:px-6 first:sm:pl-1 last:sm:pr-1', !isLast && 'sm:border-r sm:border-border-subtle')}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            complete ? 'bg-success-soft text-success' : 'bg-surface-raised text-muted-foreground',
          )}
        >
          {complete ? <CheckCircle2 size={16} strokeWidth={2} /> : <Icon size={15} strokeWidth={2} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{t(`documents:${DOCUMENT_TYPE_KEYS[type]}`)}</p>
          <p className="text-2xs text-muted-foreground tabular-nums">
            {t('documentPipeline.linked', { count: docs.length })}
            {drafts > 0 && (
              <>
                {' · '}
                <Link
                  to="/documents"
                  search={{ type, status: 'draft', projectId }}
                  className="text-primary transition-opacity hover:opacity-75 hover:underline underline-offset-2"
                >
                  {t('documentPipeline.draft', { count: drafts })}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {docs.length === 0 ? (
        <p className="text-2xs text-muted-foreground pl-1">{t('documentPipeline.noneYet')}</p>
      ) : (
        <ul>
          {docs.slice(0, 3).map((doc) => {
            const due = dueDateMeta(doc, t)
            return (
              <li key={doc.id}>
                <Link
                  to="/documents/$documentId"
                  params={{ documentId: doc.id }}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-raised transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{doc.number}</p>
                    <p
                      className={cn(
                        'text-2xs truncate',
                        due.tone === 'danger' && 'text-danger',
                        due.tone === 'warning' && 'text-warning',
                        due.tone === 'default' && 'text-muted-foreground',
                      )}
                    >
                      {due.label}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <DocumentStatusIcon
                      status={doc.status}
                      type={doc.type}
                      dueDate={doc.dueDate}
                      size={14}
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function ProjectDocumentPipeline({
  docs,
  projectId,
}: {
  docs: Document[]
  projectId: string
}) {
  const byType = (type: DocumentType) => docs.filter((d) => d.type === type && isDocumentActive(d))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 sm:divide-y-0">
      {STAGE_ORDER.map((type, i) => (
        <Stage
          key={type}
          type={type}
          docs={byType(type)}
          projectId={projectId}
          isLast={i === STAGE_ORDER.length - 1}
        />
      ))}
    </div>
  )
}
