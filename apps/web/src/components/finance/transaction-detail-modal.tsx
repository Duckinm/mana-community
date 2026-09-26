import { aiFlagKey } from "@/components/finance/ai-flag-labels";
import {
  STATUS_COLOR,
  STATUS_COLOR_SOFT,
} from "@/components/finance/constants";
import { categoryIcon } from "@/components/finance/transaction-modal-helpers";
import type { Transaction, Wallet } from "@/components/finance/types";
import { MoreHorizontal, Pencil, RotateCw, Trash2, X } from "@/components/icons";
import { AiBadge } from "@/components/ui/ai-badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { menuItemDestructive } from "@/components/ui/menu-styles";
import { useProjects } from "@/context/projects";
import { resolveCurrency, useCurrency } from "@/hooks/use-currency";
import { formatCalendarDate } from "@/lib/calendar-date";
import { categoryLabel } from "@/components/finance/transaction-modal-helpers";
import { useTranslation } from "react-i18next";

const STATUS_LABEL_KEY: Record<string, string> = {
  received: "statusReceived",
  paid: "statusPaid",
  pending: "statusPending",
  overdue: "statusOverdue",
};

const headerIconBtn =
  "flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-sm text-foreground">{children}</span>
    </div>
  );
}

function EmptyDash() {
  return <span className="text-muted-foreground">—</span>;
}

function ColorDotValue({ color, name }: { color: string; name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function TransactionDetailModal({
  tx,
  wallets,
  onClose,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  wallets: Wallet[];
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation("accounting");
  const { currency } = useCurrency();
  const { projects } = useProjects();

  const txCurrency = resolveCurrency(tx.currency, currency);
  const proj = tx.projectId
    ? projects.find((p) => p.id === tx.projectId)
    : null;
  const wallet = tx.walletId ? wallets.find((w) => w.id === tx.walletId) : null;

  const isRevenue = tx.type === "revenue";
  const sign = isRevenue ? "+" : "−";
  const amount = tx.amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const needsAiReview = tx.source === "ai_receipt" && !tx.reviewedAt;
  const CategoryIcon = tx.category ? categoryIcon(tx.category) : null;
  const showActions = Boolean(onEdit && onDelete);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideCloseButton className="max-w-md gap-0 p-6">
        <div className="absolute right-2 top-2 z-10 flex items-center max-xl:top-3">
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("transactions.rowActions")}
                  className={headerIconBtn}
                >
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    onClose();
                    onEdit?.();
                  }}
                >
                  <Pencil />
                  {t("transactions.editTransaction")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={menuItemDestructive}
                  onSelect={onDelete}
                >
                  <Trash2 />
                  {t("transactions.deleteTransaction")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DialogClose className={headerIconBtn}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <DialogHeader className={showActions ? "gap-2 pr-20" : "gap-2 pr-10"}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{formatCalendarDate(tx.date)}</span>
            <span
              className="inline-block rounded-md px-2 py-0.5 text-2xs font-semibold capitalize"
              style={{
                color: STATUS_COLOR[tx.status],
                background: STATUS_COLOR_SOFT[tx.status],
              }}
            >
              {t(`transactions.${STATUS_LABEL_KEY[tx.status]}`)}
            </span>
            {needsAiReview && <AiBadge label={t("transactions.aiReview")} />}
          </div>
          <DialogTitle className="text-left text-base font-semibold leading-snug">
            {tx.description}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("transactions.detail.title")}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-5 mt-4 flex items-baseline justify-between">
          <span
            className="text-3xl font-semibold tabular-nums tracking-tight"
            style={{
              color: isRevenue ? "var(--success)" : "var(--destructive)",
            }}
          >
            {sign}
            {txCurrency.symbol}
            {amount}
          </span>
          <span className="text-xs text-muted-foreground">
            {isRevenue
              ? t("transactions.typeRevenue")
              : t("transactions.typeExpense")}
            {" · "}
            {txCurrency.code}
          </span>
        </div>

        <div className="divide-y divide-border-subtle border-y border-border-subtle">
          <DetailRow label={t("transactions.detail.category")}>
            {tx.category ? (
              <span className="flex min-w-0 items-center gap-2">
                {CategoryIcon && (
                  <CategoryIcon
                    size={14}
                    className="shrink-0 text-muted-foreground"
                  />
                )}
                <span className="truncate">{categoryLabel(tx.category, t)}</span>
              </span>
            ) : (
              <EmptyDash />
            )}
          </DetailRow>
          <DetailRow label={t("transactions.detail.wallet")}>
            {wallet ? (
              <ColorDotValue color={wallet.color} name={wallet.name} />
            ) : (
              <EmptyDash />
            )}
          </DetailRow>
          <DetailRow label={t("transactions.detail.project")}>
            {proj ? (
              <ColorDotValue color={proj.color} name={proj.name} />
            ) : (
              <EmptyDash />
            )}
          </DetailRow>
          <DetailRow label={t("transactions.detail.reference")}>
            {tx.reference ? (
              <span className="font-mono text-xs">{tx.reference}</span>
            ) : (
              <EmptyDash />
            )}
          </DetailRow>
          <DetailRow label={t("transactions.detail.recurring")}>
            {tx.isRecurring ? (
              <span className="flex items-center gap-1.5">
                <RotateCw
                  size={12}
                  className="shrink-0 text-muted-foreground"
                />
                {tx.recurringInterval
                  ? t(`transactions.modal.${tx.recurringInterval}`)
                  : t("transactions.modal.recurring")}
              </span>
            ) : (
              <EmptyDash />
            )}
          </DetailRow>
          <DetailRow label={t("transactions.detail.source")}>
            {tx.source === "ai_receipt" ? (
              <span className="flex flex-col gap-0.5">
                <span>
                  {tx.reviewedAt
                    ? t("transactions.aiReceiptReviewed")
                    : t("transactions.aiReceiptNeedsReview")}
                </span>
                {needsAiReview && tx.aiFlags && tx.aiFlags.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {tx.aiFlags
                      .map((flag) => {
                        const key = aiFlagKey(flag);
                        return key ? t(key) : null;
                      })
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </span>
            ) : (
              t("transactions.detail.sourceManual")
            )}
          </DetailRow>
        </div>

        <div className="pb-1 pt-3">
          <p className="mb-1 text-xs text-muted-foreground">
            {t("transactions.detail.notes")}
          </p>
          <p className="whitespace-pre-wrap pb-2 text-sm text-caption">
            {tx.notes || <EmptyDash />}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
