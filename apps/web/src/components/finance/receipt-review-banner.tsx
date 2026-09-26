import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "@/components/icons";
import { useTranslation } from "react-i18next";

interface ReceiptReviewBannerProps {
  count: number;
  filtered: boolean;
  approving: boolean;
  onToggleFilter: () => void;
  onApproveAll: () => void;
}

function ReceiptReviewBanner({
  count,
  filtered,
  approving,
  onToggleFilter,
  onApproveAll,
}: ReceiptReviewBannerProps) {
  const { t } = useTranslation("accounting");

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 max-sm:flex-col max-sm:items-stretch">
      <div className="flex min-w-0 flex-1 items-start gap-2.5 max-sm:w-full">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-warning" />
        <p className="min-w-0 flex-1 text-sm leading-snug text-foreground">
          {t(
            count === 1
              ? "transactions.reviewQueueOne"
              : "transactions.reviewQueueMany",
            { count },
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onToggleFilter}>
          {filtered
            ? t("transactions.reviewQueueShowAll")
            : t("transactions.reviewQueueShowPending")}
        </Button>
        <Button size="sm" onClick={onApproveAll} disabled={approving}>
          {approving && <Loader2 size={14} className="animate-spin" />}
          {t("transactions.reviewQueueApproveAll")}
        </Button>
      </div>
    </div>
  );
}

export { ReceiptReviewBanner };
