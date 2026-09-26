import { ApprovalReceivedBanner } from "@/components/documents/approval-received-banner";
import { DocumentDetailSkeleton } from "@/components/documents/document-detail-skeleton";
import { DocumentProjectPicker } from "@/components/documents/document-project-picker";
import { DocumentPaidBadge } from "@/components/documents/document-paid-badge";
import { DocumentRecurringBadge } from "@/components/documents/document-recurring-badge";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { DocumentNumber } from "@/components/documents/document-number";
import { VersionHistorySection } from "@/components/documents/document-version-history";
import { GuestDocumentView } from "@/components/documents/guest/guest-document-view";
import {
  LinkTransactionPicker,
  LinkTransactionWarningBanner,
} from "@/components/documents/link-transaction-picker";
import { PaymentSlipUpload } from "@/components/documents/payment-slip-upload";
import { PaymentSlipReviewPanel } from "@/components/documents/payment-slip-review-panel";
import {
  DocumentActionsMenu,
  documentActionDestructiveItemClass,
} from "@/components/documents/document-actions-menu";
import {
  canPromoteDocument,
  isDocumentOpenForPayment,
} from "@/lib/document-helpers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { applyDocumentDisplayStatus } from "@/lib/document-display-status";
import { EntityNotFound } from "@/components/ui/entity-not-found";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { isApiError } from "@/lib/api-error";
import { useProjects } from "@/context/projects";
import { useDocuments } from "@/hooks/use-documents";
import { useShowBranding } from "@/hooks/use-show-branding";
import {
  invalidateDocument,
  invalidateTransactions,
} from "@/lib/invalidate-helpers";
import { formatCalendarDate, isEmptyDateLabel, todayCalendarDate } from "@/lib/calendar-date";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Download,
  Link2,
  MoreHorizontal,
} from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function DocumentDetailPage({
  documentId,
  variant = "page",
}: {
  documentId: string;
  variant?: "page" | "overlay";
}) {
  const shellClass =
    variant === "overlay"
      ? "space-y-6"
      : "page-pad mx-auto max-w-5xl space-y-6 py-5 max-xl:pb-mobile-dock lg:py-6";
  const stateShellClass =
    variant === "overlay"
      ? "py-2"
      : "page-pad py-5 max-xl:pb-mobile-dock lg:py-6";
  const { t } = useTranslation("documents");
  const { deleteDocument } = useDocuments();
  const { projects } = useProjects();
  const showBranding = useShowBranding();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [linkWarning, setLinkWarning] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const approvalDismissKey = `dismissed-approval-${documentId}`;
  const [approvalDismissed, setApprovalDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      !!localStorage.getItem(approvalDismissKey),
  );

  const {
    data: rawDoc,
    isLoading,
    isError,
    error,
    refetch,
    isFetched,
  } = useQuery({
    queryKey: queryKeys.document(documentId),
    queryFn: async () =>
      applyDocumentDisplayStatus(
        expectEden(await client.api.documents({ id: documentId }).get()),
      ),
  });

  const parentDocumentId = rawDoc?.parentDocumentId ?? null;

  const { data: parentDoc } = useQuery({
    queryKey: queryKeys.document(parentDocumentId ?? ""),
    queryFn: async () =>
      applyDocumentDisplayStatus(
        expectEden(await client.api.documents({ id: parentDocumentId! }).get()),
      ),
    enabled: !!parentDocumentId,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: queryKeys.documentVersions(documentId),
    queryFn: async () =>
      expectEden(await client.api.documents({ id: documentId }).versions.get()),
    enabled: versionsOpen,
  });

  if (isLoading)
    return (
      <div className={shellClass}>
        <DocumentDetailSkeleton />
      </div>
    );
  if (isError) {
    if (isApiError(error) && error.status === 404) {
      return (
        <div className={stateShellClass}>
          <EntityNotFound backTo="/documents" />
        </div>
      );
    }
    return (
      <div className={stateShellClass}>
        <QueryErrorPanel onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!rawDoc && isFetched)
    return (
      <div className={stateShellClass}>
        <EntityNotFound backTo="/documents" />
      </div>
    );
  if (!rawDoc) return null;

  const doc = {
    ...rawDoc,
    projectName: rawDoc.projectId
      ? (projects.find((p) => p.id === rawDoc.projectId)?.name ?? null)
      : null,
  };

  const currency = doc.currency;
  const activePaymentSlip =
    doc.paymentSlips?.find(
      (slip) =>
        slip.status === "proposed" ||
        slip.status === "mismatched" ||
        slip.status === "failed",
    ) ?? null;
  const hasVerifiedSlip =
    doc.paymentSlips?.some(
      (slip) => slip.status === "confirmed" && slip.apiVerified,
    ) ?? false;
  const issuedLabel = formatCalendarDate(doc.issueDate);
  const dueLabel = formatCalendarDate(doc.dueDate);
  const showIssued = !isEmptyDateLabel(issuedLabel);
  const showDue = !isEmptyDateLabel(dueLabel);
  const quotationLinkExpired =
    doc.type === "QO" && !!doc.validUntilDate && doc.validUntilDate < todayCalendarDate();

  async function handleDownloadPdf() {
    setPdfLoading(true);
    // window.open must be called synchronously inside the click gesture —
    // after the await, Chrome may silently popup-block the new tab
    const win = window.open("", "_blank");
    try {
      const result = await client.api.documents({ id: doc.id }).pdf.get();
      if (result.error) throw result.error;
      const res = result.data;
      if (res && "url" in res && res.url) {
        if (win) {
          win.opener = null;
          win.location.replace(res.url);
        } else {
          window.location.assign(res.url);
        }
      } else if (res && "status" in res) {
        win?.close();
        const pdfStatus = (res as { status: string }).status;
        if (pdfStatus === "generating") {
          toast(t("toast.pdfGenerating"));
        } else if (pdfStatus === "failed") {
          toast.error(t("toast.pdfGenerationFailed"));
        }
      }
    } catch (err) {
      win?.close();
      throw err;
    } finally {
      setPdfLoading(false);
    }
  }

  function handleDismissApproval() {
    localStorage.setItem(approvalDismissKey, "1");
    setApprovalDismissed(true);
  }

  async function handleTransactionLinked(result: { warning?: string }) {
    await Promise.all([
      invalidateDocument(queryClient, doc.id),
      invalidateTransactions(queryClient),
    ]);
    if (result.warning) {
      setLinkWarning(result.warning);
    } else {
      toast(t("toast.transactionLinked"));
    }
  }

  async function handleUnlinkTransaction() {
    setUnlinking(true);
    try {
      expectEden(
        await client.api.documents({ id: doc.id })["unlink-transaction"].post(),
      );
      await Promise.all([
        invalidateDocument(queryClient, doc.id),
        invalidateTransactions(queryClient),
      ]);
      setLinkWarning(null);
      toast(t("toast.transactionUnlinked"));
    } finally {
      setUnlinking(false);
    }
  }

  async function handleSlipUploaded() {
    await invalidateDocument(queryClient, doc.id);
    toast(t("toast.paymentSlipUploaded"));
  }

  async function handleSlipConfirmed(result: { warning?: string | null }) {
    await Promise.all([
      invalidateDocument(queryClient, doc.id),
      invalidateTransactions(queryClient),
    ]);
    if (result.warning) {
      setLinkWarning(result.warning);
    } else {
      toast(t("toast.paymentSlipConfirmed"));
    }
  }

  async function handleSlipDismissed() {
    await invalidateDocument(queryClient, doc.id);
    toast(t("toast.paymentSlipDismissed"));
  }

  async function handleSlipVerified() {
    await invalidateDocument(queryClient, doc.id);
    toast(t("toast.paymentSlipVerified"));
  }

  return (
    <div className={shellClass}>
      {doc.clientStatus === "client_approved" &&
        canPromoteDocument(doc) &&
        !approvalDismissed && (
          <ApprovalReceivedBanner
            doc={doc}
            onPromote={() =>
              navigate({
                to: "/documents/$documentId/promote",
                params: { documentId: doc.id },
              })
            }
            onDismiss={handleDismissApproval}
          />
        )}

      {linkWarning && (
        <LinkTransactionWarningBanner
          warning={linkWarning}
          onDismiss={() => setLinkWarning(null)}
          onUnlink={handleUnlinkTransaction}
          unlinking={unlinking}
        />
      )}

      <LinkTransactionPicker
        documentId={doc.id}
        currency={doc.currency}
        open={linkPickerOpen}
        onOpenChange={setLinkPickerOpen}
        onLinked={handleTransactionLinked}
      />

      <div className="flex items-center gap-1.5 text-sm text-caption">
        <Link
          to="/documents"
          className="hover:text-muted-foreground transition-colors duration-fast"
        >
          {t("breadcrumbDocuments")}
        </Link>
        <ChevronRight size={12} />
        <span className="text-foreground font-medium">{doc.number}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h1 className="text-lg font-bold font-mono text-foreground sm:text-2xl">
              <DocumentNumber number={doc.number} type={doc.type} />
            </h1>
            <DocumentStatusBadge
              status={doc.status}
              type={doc.type}
              dueDate={doc.dueDate}
            />
            {doc.type !== "QO" && (
              <span className="relative inline-flex w-fit shrink-0">
                <DocumentPaidBadge paidAt={doc.paidAt ?? null} />
                {hasVerifiedSlip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="absolute -right-1.5 -top-1.5 inline-flex cursor-default items-center justify-center rounded-full bg-info text-ink-on-accent ring-2 ring-card">
                        <BadgeCheck size={13} weight="fill" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {t("paymentSlip.verifiedBadgeTooltip")}
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
            )}
            {doc.isRecurring && doc.recurringInterval && (
              <DocumentRecurringBadge interval={doc.recurringInterval} />
            )}
            {(doc.publicAccessRevokedAt || quotationLinkExpired) && (
              <span className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t(doc.publicAccessRevokedAt ? "actionsMenu.publicLinkRevoked" : "actionsMenu.quotationLinkExpired")}
              </span>
            )}
          </div>
          <DocumentActionsMenu
            doc={doc}
            trigger={
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label={t("documentDetail.documentActions")}
                className="shrink-0 [@media(pointer:coarse)]:!size-8"
              >
                <MoreHorizontal size={16} />
              </Button>
            }
          >
            {(items) => (
              <>
                {items.publish}
                {items.sendToClient}
                {items.sendEtax}
                {items.publicLinkStatus}
                {items.copyPublicLink}
                {items.openPublicView}
                {items.rotatePublicLink}
                {items.revokePublicLink}
                <DropdownMenuSeparator />
                {items.promote}
                {items.edit}
                {isDocumentOpenForPayment(doc) && (
                  <DropdownMenuItem onClick={() => setLinkPickerOpen(true)}>
                    <Link2 size={14} />
                    {t("documentDetail.linkExistingTransaction")}
                  </DropdownMenuItem>
                )}
                {doc.status === "published" && (
                  <DropdownMenuItem
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                  >
                    <Download size={14} />
                    {pdfLoading
                      ? t("documentDetail.downloading")
                      : t("documentDetail.downloadPdf")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setArchiveOpen(true)}
                  className={documentActionDestructiveItemClass}
                >
                  <Archive size={14} />
                  {doc.status === "draft"
                    ? t("documentDetail.delete")
                    : t("documentDetail.archive")}
                </DropdownMenuItem>
              </>
            )}
          </DocumentActionsMenu>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          {(showIssued || showDue) && (
            <span className="whitespace-nowrap">
              {showIssued && `${t("preview.issued")} ${issuedLabel}`}
              {showIssued && showDue && " · "}
              {showDue && `${t("preview.due")} ${dueLabel}`}
            </span>
          )}
          {parentDocumentId && parentDoc && (
            <Link
              to="/documents/$documentId"
              params={{ documentId: parentDocumentId }}
              className="inline-flex shrink-0 items-center gap-1 text-caption transition-colors duration-fast hover:text-foreground"
            >
              <ArrowRight size={11} className="opacity-50" />
              {parentDoc.number}
            </Link>
          )}
          <DocumentProjectPicker
            documentId={doc.id}
            projectId={doc.projectId}
            projectName={doc.projectName}
          />
        </div>
      </div>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {doc.status === "draft"
                ? t("documentDetail.deleteTitle", { number: doc.number })
                : t("documentDetail.archiveTitle", { number: doc.number })}
            </DialogTitle>
            <DialogDescription>
              {doc.status === "draft"
                ? t("documentDetail.deleteDescription")
                : t("documentDetail.archiveDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              {t("documentDetail.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteDocument(doc.id);
                navigate({ to: "/documents" });
              }}
            >
              {doc.status === "draft"
                ? t("documentDetail.delete")
                : t("documentDetail.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GuestDocumentView document={doc} className="max-w-none" showBranding={showBranding} />

      {doc.type === "INV" &&
        isDocumentOpenForPayment(doc) &&
        (activePaymentSlip ? (
          <PaymentSlipReviewPanel
            documentId={doc.id}
            slip={activePaymentSlip}
            currency={currency}
            onConfirmed={handleSlipConfirmed}
            onDismissed={handleSlipDismissed}
            onVerified={handleSlipVerified}
            onRetried={handleSlipUploaded}
          />
        ) : (
          <PaymentSlipUpload
            target={{ kind: "owner", documentId: doc.id }}
            onUploaded={handleSlipUploaded}
          />
        ))}

      <VersionHistorySection
        documentId={documentId}
        currentDoc={doc}
        versions={versions}
        versionsLoading={versionsLoading}
        versionsOpen={versionsOpen}
        onToggle={() => setVersionsOpen((v) => !v)}
      />
    </div>
  );
}
