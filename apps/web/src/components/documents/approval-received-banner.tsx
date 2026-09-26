import { ArrowRight, CheckCircle2, X } from "@/components/icons";
import type { Document } from "@/components/documents/types";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/timestamp";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ApprovalReceivedBannerProps {
  doc: Document & {
    clientStatus?: string | null;
    clientApprovedAt?: string | null;
    clientApprovalIp?: string | null;
  };
  onPromote: () => void;
  onDismiss: () => void;
}

function readableApprovalIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return null;
  return trimmed;
}

export function ApprovalReceivedBanner({
  doc,
  onPromote,
  onDismiss,
}: ApprovalReceivedBannerProps) {
  const { t } = useTranslation("documents");
  const promoteLabel =
    doc.type === "QO"
      ? t("approvalBanner.createInvoice")
      : doc.type === "INV"
        ? t("approvalBanner.generateReceipt")
        : null;

  const approvedAt = doc.clientApprovedAt
    ? formatTimestamp(doc.clientApprovedAt)
    : null;
  const approvalIp = readableApprovalIp(doc.clientApprovalIp);
  const meta = [approvedAt, approvalIp ? `IP ${approvalIp}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="rounded-xl border border-success-border bg-success-soft p-3.5 sm:p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-success">
            <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {t("approvalBanner.clientApproved")}
                </p>
                {meta ? (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    {meta}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onDismiss}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground"
                aria-label={t("approvalBanner.dismiss")}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {promoteLabel ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 h-9 w-full gap-1.5 border-success-border bg-card text-success hover:bg-card hover:text-success sm:w-auto"
                onClick={onPromote}
              >
                {promoteLabel}
                <ArrowRight size={13} strokeWidth={2} />
              </Button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
