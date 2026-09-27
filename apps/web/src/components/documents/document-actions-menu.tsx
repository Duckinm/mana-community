import { useCapabilities } from '@/hooks/use-capabilities'
import { EmailCapabilityNotice } from '@/components/capability-notice'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useDocuments } from '@/hooks/use-documents'
import { useSettings } from '@/context/settings'
import type { Document } from '@/components/documents/types'
import { isApiError } from '@/lib/api-error'
import { canPromoteDocument } from '@/lib/document-helpers'
import { DOCUMENT_TYPE_KEYS, DOCUMENT_TYPE_LOWER_KEYS } from '@/components/documents/constants'
import { useNavigate } from '@tanstack/react-router'
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Send,
  ArrowRight,
  Archive,
  Trash2,
  Mail,
  Link,
  ExternalLink,
  BadgeCheck,
  RotateCw,
} from '@/components/icons'
import { todayCalendarDate } from '@/lib/calendar-date'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { menuItemDestructive } from '@/components/ui/menu-styles'
import { PublishDialog } from '@/components/documents/publish-dialog'

export const documentActionDestructiveItemClass = menuItemDestructive

export type DocumentActionItems = {
  view: ReactNode
  promote: ReactNode
  publish: ReactNode
  sendToClient: ReactNode
  sendEtax: ReactNode
  publicLinkStatus: ReactNode
  copyPublicLink: ReactNode
  openPublicView: ReactNode
  rotatePublicLink: ReactNode
  revokePublicLink: ReactNode
  edit: ReactNode
  archive: ReactNode
  deleteDraft: ReactNode
}

export function buildDocumentActionItems({
  doc,
  root,
  t,
  navigate,
  deleteDocument,
  setPublishDialogOpen,
  setSendDialogOpen,
  setSendEtaxDialogOpen,
  setRotateLinkDialogOpen,
  setRevokeLinkDialogOpen,
  setDeleteDialogOpen,
  etaxAvailable,
}: {
  doc: Document
  root: 'dropdown' | 'context'
  t: (key: string, options?: Record<string, unknown>) => string
  navigate: ReturnType<typeof useNavigate>
  deleteDocument: (id: string) => void
  setPublishDialogOpen: (open: boolean) => void
  setSendDialogOpen: (open: boolean) => void
  setSendEtaxDialogOpen: (open: boolean) => void
  setRotateLinkDialogOpen: (open: boolean) => void
  setRevokeLinkDialogOpen: (open: boolean) => void
  setDeleteDialogOpen: (open: boolean) => void
  etaxAvailable: boolean
}): DocumentActionItems {
  const Item = root === 'dropdown' ? DropdownMenuItem : ContextMenuItem
  const destructiveClass = documentActionDestructiveItemClass
  const quotationLinkExpired =
    doc.type === 'QO' && !!doc.validUntilDate && doc.validUntilDate < todayCalendarDate()
  const publicLinkUnavailable = !!doc.publicAccessRevokedAt || quotationLinkExpired

  const promoteLabel =
    doc.type === 'QO'
      ? t('actionsMenu.convertToInvoice')
      : doc.type === 'INV'
        ? t('actionsMenu.generateReceipt')
        : null

  return {
    view: (
      <Item
        key="view"        onSelect={() => {
          navigate({ to: '/documents/$documentId', params: { documentId: doc.id } })
        }}
      >
        <Eye size={12} />
        {t('actionsMenu.view')}
      </Item>
    ),
    promote:
      promoteLabel && canPromoteDocument(doc) ? (
        <Item
          key="promote"
          onSelect={() =>
            navigate({
              to: '/documents/$documentId/promote',
              params: { documentId: doc.id },
            })
          }
        >
          <ArrowRight size={12} />
          {promoteLabel}
        </Item>
      ) : null,
    publish:
      doc.status === 'draft' ? (
        <Item key="publish" onSelect={() => setPublishDialogOpen(true)}>
          <Send size={12} />
          {t('actionsMenu.publish')}
        </Item>
      ) : null,
    sendToClient:
      doc.status !== 'draft' ? (
        <Item
          key="send-to-client"
          disabled={!doc.clientEmail}
          title={doc.clientEmail ? undefined : t('actionsMenu.noClientEmail')}
          onSelect={() => setSendDialogOpen(true)}
        >
          <Mail size={12} />
          {t('actionsMenu.sendToClient')}
        </Item>
      ) : null,
    sendEtax:
      doc.type === 'INV' && (doc.status === 'published' || doc.status === 'overdue') ? (
        <Item
          key="send-etax"
          disabled={!etaxAvailable}
          title={etaxAvailable ? undefined : t('actionsMenu.etaxThailandOnly')}
          onSelect={() => setSendEtaxDialogOpen(true)}
        >
          <BadgeCheck size={12} />
          {t('actionsMenu.sendEtax')}
        </Item>
      ) : null,
    publicLinkStatus:
      doc.status !== 'draft' && publicLinkUnavailable ? (
        <Item key="public-link-status" disabled>
          <Link size={12} />
          {t(doc.publicAccessRevokedAt ? 'actionsMenu.publicLinkRevoked' : 'actionsMenu.quotationLinkExpired')}
        </Item>
      ) : null,
    copyPublicLink:
      doc.status !== 'draft' && doc.publicToken && !publicLinkUnavailable ? (
        <Item
          key="copy-public-link"
          onSelect={() => {
            void navigator.clipboard.writeText(
              `${window.location.origin}/view/${doc.publicToken}`,
            )
            toast.success(t('actionsMenu.linkCopied'))
          }}
        >
          <Link size={12} />
          {t('actionsMenu.copyPublicLink')}
        </Item>
      ) : null,
    openPublicView:
      doc.status !== 'draft' && doc.publicToken && !publicLinkUnavailable ? (
        <Item
          key="open-public-view"
          onSelect={() => {
            window.open(`/view/${doc.publicToken}`, '_blank')
          }}
        >
          <ExternalLink size={12} />
          {t('actionsMenu.openPublicView')}
        </Item>
      ) : null,
    rotatePublicLink:
      doc.status !== 'draft' ? (
        <Item key="rotate-public-link" onSelect={() => setRotateLinkDialogOpen(true)}>
          <RotateCw size={12} />
          {t('actionsMenu.rotatePublicLink')}
        </Item>
      ) : null,
    revokePublicLink:
      doc.status !== 'draft' && !doc.publicAccessRevokedAt ? (
        <Item
          key="revoke-public-link"
          className={destructiveClass}
          onSelect={() => setRevokeLinkDialogOpen(true)}
        >
          <Link size={12} />
          {t('actionsMenu.revokePublicLink')}
        </Item>
      ) : null,
    edit: (
      <Item
        key="edit"        onSelect={() => {
          navigate({
            to: '/documents/$documentId/edit',
            params: { documentId: doc.id },
          })
        }}
      >
        <Pencil size={12} />
        {t('actionsMenu.edit')}
      </Item>
    ),
    archive: (
      <Item key="archive" className={destructiveClass} onSelect={() => deleteDocument(doc.id)}>
        <Archive size={12} />
        {t('actionsMenu.archive')}
      </Item>
    ),
    deleteDraft:
      doc.status === 'draft' ? (
        <Item
          key="delete"
          className={destructiveClass}
          onSelect={() => setDeleteDialogOpen(true)}
        >
          <Trash2 size={12} />
          {t('actionsMenu.delete')}
        </Item>
      ) : null,
  }
}

export function DocumentActionSeparator({ root }: { root: 'dropdown' | 'context' }) {
  const Sep = root === 'dropdown' ? DropdownMenuSeparator : ContextMenuSeparator
  return <Sep />
}

function DocumentActionDialogs({
  doc,
  deleteDialogOpen,
  setDeleteDialogOpen,
  sendDialogOpen,
  setSendDialogOpen,
  sending,
  handleSendEmail,
  sendEtaxDialogOpen,
  setSendEtaxDialogOpen,
  sendingEtax,
  handleSendEtax,
  publishDialogOpen,
  setPublishDialogOpen,
  rotateLinkDialogOpen,
  setRotateLinkDialogOpen,
  revokeLinkDialogOpen,
  setRevokeLinkDialogOpen,
  publicLinkActionPending,
  handleRotatePublicLink,
  handleRevokePublicLink,
  deleteDocument,
}: {
  doc: Document
  deleteDialogOpen: boolean
  setDeleteDialogOpen: (open: boolean) => void
  sendDialogOpen: boolean
  setSendDialogOpen: (open: boolean) => void
  sending: boolean
  handleSendEmail: () => Promise<void>
  sendEtaxDialogOpen: boolean
  setSendEtaxDialogOpen: (open: boolean) => void
  sendingEtax: boolean
  handleSendEtax: () => Promise<void>
  publishDialogOpen: boolean
  setPublishDialogOpen: (open: boolean) => void
  rotateLinkDialogOpen: boolean
  setRotateLinkDialogOpen: (open: boolean) => void
  revokeLinkDialogOpen: boolean
  setRevokeLinkDialogOpen: (open: boolean) => void
  publicLinkActionPending: boolean
  handleRotatePublicLink: () => Promise<void>
  handleRevokePublicLink: () => Promise<void>
  deleteDocument: (id: string) => void
}) {
  const { t } = useTranslation('documents')
  const capabilities = useCapabilities()
  const emailAvailable = !capabilities.isError && !!capabilities.data && capabilities.data.email !== 'disabled'

  return (
    <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border border-border-subtle bg-surface-card sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actionsMenu.deleteDraftTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('actionsMenu.deleteDraftDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actionsMenu.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteDocument(doc.id)}
            >
              {t('actionsMenu.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <AlertDialogContent className="border border-border-subtle bg-surface-card sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('actionsMenu.sendToClientTitle', {
                type: t(DOCUMENT_TYPE_KEYS[doc.type]),
                number: doc.number,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {doc.clientEmail
                ? t('actionsMenu.sendToClientDescription', {
                    type: t(DOCUMENT_TYPE_LOWER_KEYS[doc.type]),
                    email: doc.clientEmail,
                  })
                : t('actionsMenu.noClientEmail')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <EmailCapabilityNotice />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>{t('actionsMenu.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending || !doc.clientEmail || !emailAvailable}
              onClick={(e) => {
                e.preventDefault()
                void handleSendEmail()
              }}
            >
              {t('actionsMenu.send')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sendEtaxDialogOpen} onOpenChange={setSendEtaxDialogOpen}>
        <AlertDialogContent className="border border-border-subtle bg-surface-card sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('actionsMenu.sendEtaxTitle', { number: doc.number })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('actionsMenu.sendEtaxDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <EmailCapabilityNotice />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingEtax}>{t('actionsMenu.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendingEtax || !emailAvailable}
              onClick={(e) => {
                e.preventDefault()
                void handleSendEtax()
              }}
            >
              {t('actionsMenu.send')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rotateLinkDialogOpen} onOpenChange={setRotateLinkDialogOpen}>
        <AlertDialogContent className="border border-border-subtle bg-surface-card sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actionsMenu.rotatePublicLinkTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('actionsMenu.rotatePublicLinkDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publicLinkActionPending}>{t('actionsMenu.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={publicLinkActionPending}
              onClick={(e) => {
                e.preventDefault()
                void handleRotatePublicLink()
              }}
            >
              {t('actionsMenu.rotatePublicLink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeLinkDialogOpen} onOpenChange={setRevokeLinkDialogOpen}>
        <AlertDialogContent className="border border-border-subtle bg-surface-card sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actionsMenu.revokePublicLinkTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('actionsMenu.revokePublicLinkDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publicLinkActionPending}>{t('actionsMenu.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={publicLinkActionPending}
              onClick={(e) => {
                e.preventDefault()
                void handleRevokePublicLink()
              }}
            >
              {t('actionsMenu.revokePublicLink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PublishDialog
        doc={doc}
        open={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
      />
    </>
  )
}

function DocumentActionsHost({
  doc,
  children,
}: {
  doc: Document
  children: (ctx: {
    items: (root: 'dropdown' | 'context') => DocumentActionItems
  }) => ReactNode
}) {
  const { t } = useTranslation('documents')
  const { t: tCapabilities } = useTranslation('capabilities')
  const capabilities = useCapabilities()
  const {
    deleteDocument,
    sendDocumentEmail,
    sendDocumentEtax,
    revokeDocumentPublicLink,
    rotateDocumentPublicLink,
  } = useDocuments()
  const { user } = useSettings()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendEtaxDialogOpen, setSendEtaxDialogOpen] = useState(false)
  const [sendingEtax, setSendingEtax] = useState(false)
  const [rotateLinkDialogOpen, setRotateLinkDialogOpen] = useState(false)
  const [revokeLinkDialogOpen, setRevokeLinkDialogOpen] = useState(false)
  const [publicLinkActionPending, setPublicLinkActionPending] = useState(false)

  async function handleSendEmail() {
    setSending(true)
    try {
      const { emailStatus } = await sendDocumentEmail(doc.id)
      if (emailStatus === 'sent') {
        toast.success(capabilities.data?.email === 'local' ? tCapabilities('localEmail') : t('actionsMenu.emailSent', { email: doc.clientEmail }))
      } else if (emailStatus === 'blocked') {
        toast.warning(t('actionsMenu.emailBlocked'))
      } else {
        toast.warning(t('actionsMenu.emailFailed'))
      }
      setSendDialogOpen(false)
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        toast.warning(t('actionsMenu.emailPlanLimit'))
        setSendDialogOpen(false)
      } else {
        toast.warning(t('actionsMenu.emailFailed'))
      }
    } finally {
      setSending(false)
    }
  }

  async function handleSendEtax() {
    setSendingEtax(true)
    try {
      const { emailStatus } = await sendDocumentEtax(doc.id)
      if (emailStatus === 'sent') {
        toast.success(capabilities.data?.email === 'local' ? tCapabilities('localEmail') : t('actionsMenu.etaxSent'))
      } else if (emailStatus === 'blocked') {
        toast.warning(t('actionsMenu.etaxBlocked'))
      } else {
        toast.warning(t('actionsMenu.etaxFailed'))
      }
      setSendEtaxDialogOpen(false)
    } catch (err) {
      if (isApiError(err) && err.message.startsWith('ETAX_NOT_ENABLED')) {
        toast.warning(t('actionsMenu.etaxNotEnabled'))
      } else if (isApiError(err) && err.message.startsWith('ETAX_THAILAND_ONLY')) {
        toast.warning(t('actionsMenu.etaxThailandOnly'))
      } else if (isApiError(err) && err.message.startsWith('ETAX_PDF_NOT_READY')) {
        toast.warning(t('actionsMenu.etaxPdfNotReady'))
      } else if (isApiError(err) && err.message.startsWith('ETAX_NO_CLIENT_EMAIL')) {
        toast.warning(t('actionsMenu.etaxNoClientEmail'))
      } else if (isApiError(err) && err.message.startsWith('ETAX_PDF_TOO_LARGE')) {
        toast.warning(t('actionsMenu.etaxPdfTooLarge'))
      } else {
        toast.warning(t('actionsMenu.etaxFailed'))
      }
      setSendEtaxDialogOpen(false)
    } finally {
      setSendingEtax(false)
    }
  }

  async function handleRotatePublicLink() {
    setPublicLinkActionPending(true)
    try {
      await rotateDocumentPublicLink(doc.id)
      toast.success(t('actionsMenu.publicLinkRotated'))
      setRotateLinkDialogOpen(false)
    } catch {
      toast.error(t('actionsMenu.publicLinkActionFailed'))
    } finally {
      setPublicLinkActionPending(false)
    }
  }

  async function handleRevokePublicLink() {
    setPublicLinkActionPending(true)
    try {
      await revokeDocumentPublicLink(doc.id)
      toast.success(t('actionsMenu.publicLinkRevokedSuccess'))
      setRevokeLinkDialogOpen(false)
    } catch {
      toast.error(t('actionsMenu.publicLinkActionFailed'))
    } finally {
      setPublicLinkActionPending(false)
    }
  }

  function items(root: 'dropdown' | 'context') {
    return buildDocumentActionItems({
      doc,
      root,
      t,
      navigate,
      deleteDocument,
      setPublishDialogOpen,
      setSendDialogOpen,
      setSendEtaxDialogOpen,
      setRotateLinkDialogOpen,
      setRevokeLinkDialogOpen,
      setDeleteDialogOpen,
      etaxAvailable: user?.region === 'TH',
    })
  }

  return (
    <>
      {children({ items })}
      <DocumentActionDialogs
        doc={doc}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        sendDialogOpen={sendDialogOpen}
        setSendDialogOpen={setSendDialogOpen}
        sending={sending}
        handleSendEmail={handleSendEmail}
        sendEtaxDialogOpen={sendEtaxDialogOpen}
        setSendEtaxDialogOpen={setSendEtaxDialogOpen}
        sendingEtax={sendingEtax}
        handleSendEtax={handleSendEtax}
        publishDialogOpen={publishDialogOpen}
        setPublishDialogOpen={setPublishDialogOpen}
        rotateLinkDialogOpen={rotateLinkDialogOpen}
        setRotateLinkDialogOpen={setRotateLinkDialogOpen}
        revokeLinkDialogOpen={revokeLinkDialogOpen}
        setRevokeLinkDialogOpen={setRevokeLinkDialogOpen}
        publicLinkActionPending={publicLinkActionPending}
        handleRotatePublicLink={handleRotatePublicLink}
        handleRevokePublicLink={handleRevokePublicLink}
        deleteDocument={deleteDocument}
      />
    </>
  )
}

export function DocumentActionsMenu({
  doc,
  trigger,
  children,
}: {
  doc: Document
  trigger?: ReactNode
  children: (items: DocumentActionItems) => ReactNode
}) {
  return (
    <DocumentActionsHost doc={doc}>
      {({ items }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {trigger ?? (
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={14} />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={6}
            onClick={(e) => e.stopPropagation()}
          >
            {children(items('dropdown'))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </DocumentActionsHost>
  )
}

export function DocumentContextMenu({
  doc,
  children,
}: {
  doc: Document
  children: ReactNode
}) {
  return (
    <DocumentActionsHost doc={doc}>
      {({ items }) => {
        const menu = items('context')
        return (
          <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent>
              {menu.view}
              {menu.edit}
              {menu.publish}
              {menu.sendToClient}
              {menu.sendEtax}
              {menu.publicLinkStatus}
              {menu.copyPublicLink}
              {menu.openPublicView}
              {menu.rotatePublicLink}
              {menu.revokePublicLink}
              {menu.promote}
              <DocumentActionSeparator root="context" />
              {menu.archive}
              {menu.deleteDraft}
            </ContextMenuContent>
          </ContextMenu>
        )
      }}
    </DocumentActionsHost>
  )
}
