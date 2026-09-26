import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import i18next from '@/lib/i18n'
import { GuestDocumentView } from '@/components/documents/guest/guest-document-view'
import { GuestDocumentViewSkeleton } from '@/components/documents/guest/guest-document-view-skeleton'
import {
  PaymentSlipPendingNotice,
  PaymentSlipUpload,
} from '@/components/documents/payment-slip-upload'
import { ManaLogo } from '@/components/brand/mana-logo'
import type { Document } from '@/components/documents/types'
import { applyDocumentDisplayStatus } from '@/lib/document-display-status'
import { isDocumentOpenForPayment } from '@/lib/document-helpers'
import { formatTimestamp } from '@/lib/timestamp'
import { Download, CheckCircle2, XCircle, Clock } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = resolveApiBaseUrl()

type PdfResponse =
  | { status: 'generating' }
  | { status: 'failed'; message?: string }
  | { url: string }

type LocalStatus = 'client_approved' | 'client_rejected' | null | undefined

async function fetchDocument(token: string): Promise<Document> {
  // credentials so the API can read the session cookie and compute isOwner —
  // lets an owner previewing their own link skip the client approval bar
  const res = await fetch(`${API_URL}/api/documents/view/${token}`, { credentials: 'include' })
  if (!res.ok) throw new Error('not found')
  const raw = (await res.json()) as Record<string, unknown>
  return applyDocumentDisplayStatus(raw)
}

export function GuestDocumentPage({ token }: { token: string }) {
  const { t } = useTranslation('documents')
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.guestDocument(token),
    queryFn: () => fetchDocument(token),
    retry: false,
  })

  const [localStatus, setLocalStatus] = useState<LocalStatus>(undefined)
  const [approvedAt, setApprovedAt] = useState<string | null>(null)
  const [rejectConfirming, setRejectConfirming] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (data && localStatus === undefined) {
      const s = (data as Document & { clientStatus?: string | null }).clientStatus
      setLocalStatus((s as LocalStatus) ?? null)
      const at = (data as Document & { clientApprovedAt?: string | null }).clientApprovedAt
      if (at) setApprovedAt(at)
    }
  }, [data, localStatus])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_URL}/api/documents/view/${token}/viewed`, { method: 'PATCH', credentials: 'include' }).catch(() => {})
    }, 3000)
    return () => clearTimeout(timer)
  }, [token])

  async function handleDownloadPdf() {
    // window.open must be called synchronously inside the click gesture —
    // after the await, Chrome may silently popup-block the new tab
    const win = window.open('', '_blank')
    try {
      const res = await fetch(`${API_URL}/api/documents/view/${token}/pdf`)
      const json = (await res.json()) as PdfResponse
      if ('url' in json && json.url) {
        if (win) {
          win.opener = null
          win.location.replace(json.url)
        } else {
          window.location.assign(json.url)
        }
        return
      }
      win?.close()
      if ('status' in json && json.status === 'generating') {
        toast.info(t('toast.pdfGenerating'))
        return
      }
      if ('status' in json && json.status === 'failed') {
        toast.error(t('toast.pdfGenerationFailedGuest'))
        return
      }
      toast.error(t('toast.pdfRetrieveFailed'))
    } catch {
      win?.close()
      toast.error(t('toast.pdfRetrieveFailed'))
    }
  }

  async function handleApprove() {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/documents/view/${token}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      setLocalStatus('client_approved')
      setApprovedAt(new Date().toISOString())
      toast.success(t('toast.documentApproved'))
    } catch {
      toast.error(t('toast.approveFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRejectConfirm() {
    setActionLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/documents/view/${token}/reject`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      setLocalStatus('client_rejected')
      setRejectConfirming(false)
      toast.info(t('toast.documentDeclined'))
    } catch {
      toast.error(t('toast.declineFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const docData = data as
    | (Document & {
        clientStatus?: string | null
        clientApprovedAt?: string | null
        isOwner?: boolean
        showBranding?: boolean
      })
    | undefined
  const tg = i18next.getFixedT(docData?.documentLanguage ?? 'en', 'documents')
  // isOwner is computed server-side from the session cookie — the guest DTO no longer exposes userId
  const isOwnerViewing = !!docData?.isOwner
  const showApprovalBar =
    docData &&
    !isOwnerViewing &&
    (docData.type === 'QO' || docData.type === 'INV') &&
    docData.status === 'published' &&
    localStatus !== undefined

  const isApproved = localStatus === 'client_approved'
  const isRejected = localStatus === 'client_rejected'
  const isPending = !isApproved && !isRejected

  const activePaymentSlip =
    docData?.paymentSlips?.find(
      (slip) => slip.status === 'proposed' || slip.status === 'mismatched',
    ) ?? null
  const showPaymentSlipSection = !!docData && docData.type === 'INV' && isDocumentOpenForPayment(docData)

  function handleSlipUploaded() {
    queryClient.invalidateQueries({ queryKey: queryKeys.guestDocument(token) })
    toast.success(t('toast.paymentSlipUploaded'))
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-4xl font-bold font-mono text-foreground">404</p>
          <p className="text-base text-muted-foreground">
            This document link is invalid or has expired.
          </p>
          <p className="text-xs text-caption">
            If you believe this is an error, please contact the sender.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="print:hidden sticky top-0 z-10 bg-surface-raised/80 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ManaLogo className="h-9 w-auto" />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleDownloadPdf}
            disabled={isLoading}
          >
            <Download size={14} />
            {tg('guestView.downloadPdf')}
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-10">
        <div
          className="max-w-3xl mx-auto"
          data-pdf-ready={data ? 'true' : undefined}
        >
          {isLoading ? (
            <GuestDocumentViewSkeleton />
          ) : data ? (
            <>
              <GuestDocumentView document={data} showBranding={docData?.showBranding !== false} />
              {showPaymentSlipSection && (
                <div className="mt-6 print:hidden">
                  {activePaymentSlip ? (
                    <PaymentSlipPendingNotice />
                  ) : (
                    <>
                      {!activePaymentSlip && docData?.latestPaymentSlipStatus === 'dismissed' && (
                        <div className="mb-3 rounded-2xl border border-border-subtle bg-surface-card p-4 flex items-start gap-3">
                          <Clock size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                          <p className="text-sm text-foreground">
                            {t('paymentSlip.previousSlipDismissed')}
                          </p>
                        </div>
                      )}
                      <PaymentSlipUpload
                        target={{ kind: 'guest', token }}
                        onUploaded={handleSlipUploaded}
                        variant="guest"
                      />
                    </>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>

      {showApprovalBar && (
        <div className="print:hidden">
          <AnimatePresence mode="wait">
            {isApproved ? (
              <motion.div
                key="approved"
                initial={approvedAt && docData.clientApprovedAt ? false : { y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-x-3 bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-success-border bg-surface-card/90 px-4 py-3 shadow-modal backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:flex-nowrap sm:px-5"
              >
                <CheckCircle2 size={16} className="text-success shrink-0" />
                <span className="text-sm font-medium text-success">{tg('guestView.approvedMessage')}</span>
                {approvedAt && (
                  <span className="text-xs text-caption ml-1">{formatTimestamp(approvedAt)}</span>
                )}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex min-h-9 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:ml-2 sm:min-h-0"
                >
                  <Download size={12} />
                  {tg('guestView.savePdf')}
                </button>
              </motion.div>
            ) : isRejected ? (
              <motion.div
                key="rejected"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-x-3 bottom-3 z-20 flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-card/90 px-4 py-3 shadow-modal backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:px-5"
              >
                <XCircle size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground">{tg('guestView.declinedMessage')}</span>
              </motion.div>
            ) : isPending ? (
              <motion.div
                key="pending"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-x-3 bottom-3 z-20 rounded-2xl border border-border-subtle bg-surface-card/90 px-3 py-3 shadow-modal backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:px-5"
              >
                <AnimatePresence mode="wait">
                  {rejectConfirming ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3"
                    >
                      <span className="text-sm text-muted-foreground">{tg('guestView.areYouSure')}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRejectConfirming(false)}
                        disabled={actionLoading}
                      >
                        {tg('guestView.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRejectConfirm}
                        disabled={actionLoading}
                      >
                        {tg('guestView.yesDecline')}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3"
                    >
                      <p className="mr-auto min-w-full text-sm text-muted-foreground sm:mr-2 sm:min-w-0">{tg('guestView.readyToProceed')}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:text-danger hover:bg-danger-soft"
                        onClick={() => setRejectConfirming(true)}
                        disabled={actionLoading}
                      >
                        {tg('guestView.decline')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={actionLoading}
                      >
                        {tg('guestView.approve')}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
