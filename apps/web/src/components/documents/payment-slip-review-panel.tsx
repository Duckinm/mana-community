import { useCapabilities } from "@/hooks/use-capabilities";
import { CapabilityNotice } from "@/components/capability-notice";
import { BadgeCheck, CheckCircle2, RotateCw, TriangleAlert, XCircle } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PaymentSlip } from "@/components/documents/types";
import { formatCurrency } from "@/components/documents/utils";
import { postPaymentSlip } from "@/components/documents/payment-slip-upload";
import { formatCalendarDate } from "@/lib/calendar-date";
import { formatTimestamp } from "@/lib/timestamp";
import { client, expectEden } from "@/lib/eden";
import type {
  ApiPaymentSlipConfirmResult,
  ApiPaymentSlipDismissResult,
  ApiPaymentSlipVerifyResult,
} from "@/lib/api-types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function isSlipUnverifiedError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const value = "value" in error ? (error as { value?: unknown }).value : error;
  if (typeof value !== "object" || value === null) return false;
  return (value as { code?: string }).code === "SLIP_UNVERIFIED";
}

interface PaymentSlipReviewPanelProps {
  documentId: string;
  slip: PaymentSlip;
  currency: string;
  onConfirmed: (result: ApiPaymentSlipConfirmResult) => void;
  onDismissed: (slip: ApiPaymentSlipDismissResult["paymentSlip"]) => void;
  onVerified: (slip: ApiPaymentSlipVerifyResult["paymentSlip"]) => void;
  onRetried: (slip: PaymentSlip) => void;
}

export function PaymentSlipReviewPanel({
  documentId,
  slip,
  currency,
  onConfirmed,
  onDismissed,
  onVerified,
  onRetried,
}: PaymentSlipReviewPanelProps) {
  const capabilities = useCapabilities();
  const { t } = useTranslation("documents");
  const [confirming, setConfirming] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"confirm" | "verify" | null>(null);
  const [unverifiedDialogOpen, setUnverifiedDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: usage } = useQuery({
    queryKey: ["billing", "usage"],
    queryFn: async () => expectEden(await client.api.billing.usage.get()),
  });
  const slipVerifyCap = usage && "slipVerify" in usage ? usage.slipVerify : undefined;

  async function handleConfirm(allowUnverified = false) {
    setConfirming(true);
    try {
      const result = await client.api
        .documents({ id: documentId })
        ["payment-slip"]({ slipId: slip.id })
        .confirm.post({ allowUnverified });
      if (result.status === 409 && isSlipUnverifiedError(result.error)) {
        setUnverifiedDialogOpen(true);
        return;
      }
      onConfirmed(expectEden(result));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("paymentSlip.actionFailed"));
    } finally {
      setConfirming(false);
    }
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      const result = expectEden(
        await client.api
          .documents({ id: documentId })
          ["payment-slip"]({ slipId: slip.id })
          .dismiss.post(),
      );
      onDismissed(result.paymentSlip);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("paymentSlip.actionFailed"));
    } finally {
      setDismissing(false);
    }
  }

  async function handleRetryFile(file: File) {
    setRetrying(true);
    try {
      const { paymentSlip } = await postPaymentSlip(
        { kind: "owner", documentId },
        file,
      );
      onRetried(paymentSlip);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("paymentSlip.actionFailed"));
    } finally {
      setRetrying(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const result = expectEden(
        await client.api
          .documents({ id: documentId })
          ["payment-slip"]({ slipId: slip.id })
          .verify.post(),
      );
      onVerified(result.paymentSlip);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("paymentSlip.actionFailed"));
    } finally {
      setVerifying(false);
    }
  }

  const isMismatched = slip.status === "mismatched";
  const isFailed = slip.status === "failed";
  const isResolved = slip.status === "confirmed" || slip.status === "dismissed";
  const busy = confirming || dismissing || verifying || retrying;
  const needsConfirmationGate = isMismatched || slip.qrWarning === "qr_reused";
  const quotaAvailable =
    slipVerifyCap !== undefined &&
    (slipVerifyCap.cap === null || slipVerifyCap.used < slipVerifyCap.cap);
  const quotaExhausted = slipVerifyCap !== undefined && !quotaAvailable;
  const verifyEligible =
    !slip.apiVerified && slip.qrFound && !isResolved && !isFailed;
  const canVerify = verifyEligible && quotaAvailable && !capabilities.isError && capabilities.data?.paymentSlipVerification === true;
  const showVerifyUpsell = verifyEligible && quotaExhausted && capabilities.data?.paymentSlipVerification === true;

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {slip.apiVerified && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  size="pill"
                  className="cursor-default gap-1 bg-info-soft text-info border border-info-border"
                >
                  <BadgeCheck size={15} weight="fill" />
                  {t("paymentSlip.verifiedBadge")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t("paymentSlip.verifiedBadgeTooltip")}
              </TooltipContent>
            </Tooltip>
          )}
          {t("paymentSlip.title")}
        </p>
      </div>

      {!slip.apiVerified && <CapabilityNotice available={capabilities.data?.paymentSlipVerification} unavailableKey="paymentSlipVerificationUnavailable" />}
      {isFailed && <CapabilityNotice available={capabilities.data?.ai} unavailableKey="paymentSlipExtractionUnavailable" />}
      {!slip.apiVerified && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-raised p-3">
          <p className="text-xs text-muted-foreground">
            {t("paymentSlip.disclaimer")}
          </p>
          {canVerify && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                if (needsConfirmationGate) {
                  setPendingAction("verify");
                  setConfirmDialogOpen(true);
                } else {
                  void handleVerify();
                }
              }}
              disabled={busy}
            >
              <RotateCw size={14} className={verifying ? "animate-spin" : undefined} />
              {verifying ? t("paymentSlip.verifyingButton") : t("paymentSlip.verifyButton")}
            </Button>
          )}
        </div>
      )}

      {slip.qrWarning && !slip.apiVerified && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft p-3">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-sm text-warning">
            {slip.qrFound
              ? t("paymentSlip.qrReused")
              : t("paymentSlip.qrNotFound")}
          </p>
        </div>
      )}

      {isMismatched && slip.mismatchWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft p-3">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-warning">
              {t("paymentSlip.mismatchTitle")}
            </p>
            <p className="text-sm text-warning/90">{slip.mismatchWarning}</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft p-3">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="text-sm text-warning">
              {t("paymentSlip.extractionFailed")}
            </p>
            <Link
              to="/accounting/transactions"
              search={{ q: "", type: "all", status: "all" }}
              className="block text-xs text-muted-foreground hover:text-foreground transition-colors duration-fast"
            >
              {t("paymentSlip.recordManually")}
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-start gap-4">
        {slip.fileUrl && (
          <a
            href={slip.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
          >
            <img
              src={slip.fileUrl}
              alt={t("paymentSlip.slipImageAlt")}
              className="h-24 w-24 rounded-lg border border-border object-cover"
            />
          </a>
        )}
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {t("paymentSlip.extractedAmount")}
            </span>
            <span className="font-mono text-foreground">
              {slip.extractedAmountCents != null
                ? formatCurrency(
                    slip.extractedAmountCents,
                    slip.extractedCurrency ?? currency,
                  )
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {t("paymentSlip.extractedDate")}
            </span>
            <span className="text-foreground">
              {slip.extractedDate
                ? formatCalendarDate(slip.extractedDate)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {t("paymentSlip.uploadedAt")}
            </span>
            <span className="text-foreground">
              {formatTimestamp(slip.createdAt)}
            </span>
          </div>
          {slip.aiUncertain && (
            <p className="text-xs text-caption">
              {t("paymentSlip.aiUncertain")}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void handleRetryFile(file);
        }}
      />

      <div className="flex items-center gap-2 pt-1">
        {!isFailed && (
          <Button
            type="button"
            variant="solid"
            size="sm"
            onClick={() => {
              if (needsConfirmationGate) {
                setPendingAction("confirm");
                setConfirmDialogOpen(true);
              } else {
                void handleConfirm();
              }
            }}
            disabled={busy}
          >
            <CheckCircle2 size={14} />
            {confirming ? t("paymentSlip.confirming") : t("paymentSlip.confirm")}
          </Button>
        )}
        {isFailed ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || capabilities.isError || !capabilities.data?.ai}
          >
            <RotateCw size={14} />
            {retrying ? t("paymentSlip.retrying") : t("paymentSlip.retry")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            disabled={busy}
          >
            <XCircle size={14} />
            {dismissing ? t("paymentSlip.dismissing") : t("paymentSlip.dismiss")}
          </Button>
        )}
      </div>

      {showVerifyUpsell && (
        <Link
          to="/settings/billing"
          search={{ success: false, canceled: false }}
          className="block text-xs text-muted-foreground hover:text-foreground transition-colors duration-fast"
        >
          {t("paymentSlip.verifyQuotaExceeded")}
        </Link>
      )}

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("paymentSlip.confirmAnywayTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isMismatched && slip.mismatchWarning
                ? slip.mismatchWarning
                : t("paymentSlip.qrReused")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("documentDetail.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingAction === "verify") {
                  void handleVerify();
                } else {
                  void handleConfirm();
                }
                setConfirmDialogOpen(false);
              }}
            >
              {t("paymentSlip.confirmAnywayContinue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unverifiedDialogOpen} onOpenChange={setUnverifiedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("paymentSlip.unverifiedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("paymentSlip.unverifiedDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("documentDetail.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={(e) => {
                e.preventDefault();
                setUnverifiedDialogOpen(false);
                void handleConfirm(true);
              }}
            >
              {t("paymentSlip.confirmAnywayContinue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
