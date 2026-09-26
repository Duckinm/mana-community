import { aiFlagKey } from "@/components/finance/ai-flag-labels";
import {
  STATUS_COLOR,
  STATUS_COLOR_SOFT,
} from "@/components/finance/constants";
import { categoryLabel } from "@/components/finance/transaction-modal-helpers";
import type { Transaction } from "@/components/finance/types";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  RotateCw,
  Trash2,
} from "@/components/icons";
import { AiBadge } from "@/components/ui/ai-badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { menuItemDestructive } from "@/components/ui/menu-styles";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveCurrency, useCurrency } from "@/hooks/use-currency";
import { formatCalendarDate } from "@/lib/calendar-date";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const STATUS_LABEL_KEY: Record<string, string> = {
  received: "statusReceived",
  paid: "statusPaid",
  pending: "statusPending",
  overdue: "statusOverdue",
};

const TH =
  "px-3 py-2.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground";
const TD = "px-3 py-2.5 align-middle";
const TD_META = "px-3 py-2.5 align-middle whitespace-nowrap";

function formatAmount(tx: Transaction, symbol: string) {
  const sign = tx.type === "revenue" ? "+" : "-";
  return `${sign}${symbol}${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function TransactionRow({
  tx,
  isLast,
  onView,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  isLast: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("accounting");
  const { currency } = useCurrency();

  const txCurrency = resolveCurrency(tx.currency, currency);
  const isRevenue = tx.type === "revenue";
  const typeColor = isRevenue ? "var(--success)" : "var(--destructive)";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr
          onClick={onView}
          className={`group hover:bg-surface-raised transition-colors cursor-pointer ${isLast ? "" : "border-b border-border-subtle"}`}
        >
          <td
            className={`${TD} text-xs text-muted-foreground tabular-nums whitespace-nowrap`}
          >
            {formatCalendarDate(tx.date)}
          </td>

          <td className={`${TD} max-w-0`}>
            <div className="flex items-center gap-2 min-w-0">
              {tx.source === "ai_receipt" && !tx.reviewedAt && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0">
                      <AiBadge
                        label={
                          <span className="sr-only">
                            {t("transactions.aiReview")}
                          </span>
                        }
                        className="size-5 justify-center gap-0 p-0"
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {tx.aiFlags && tx.aiFlags.length > 0
                      ? tx.aiFlags
                          .map((flag) => {
                            const key = aiFlagKey(flag);
                            return key ? t(key) : null;
                          })
                          .filter(Boolean)
                          .join(" · ")
                      : t("transactions.aiReview")}
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-medium leading-tight truncate text-foreground">
                  {tx.description}
                </p>
                {tx.isRecurring && (
                  <RotateCw
                    size={10}
                    strokeWidth={2.5}
                    className="shrink-0 text-muted-foreground opacity-60"
                  />
                )}
              </div>
            </div>
          </td>

          <td className={`${TD_META} text-xs text-muted-foreground max-w-0`}>
            <span className="block truncate">
              {tx.category ? categoryLabel(tx.category, t) : "—"}
            </span>
          </td>

          <td className={`${TD_META} text-center`}>
            <span
              className="inline-block text-2xs font-semibold capitalize px-2 py-0.5 rounded-md"
              style={{
                color: STATUS_COLOR[tx.status],
                background: STATUS_COLOR_SOFT[tx.status],
              }}
            >
              {t(`transactions.${STATUS_LABEL_KEY[tx.status]}`)}
            </span>
          </td>

          <td
            className={`${TD_META} text-sm font-semibold tabular-nums text-right`}
            style={{ color: typeColor }}
          >
            {formatAmount(tx, txCurrency.symbol)}
          </td>

          {/* menu content is portaled but React events still bubble up the
              component tree to the row onClick — stop them at this cell */}
          <td
            className="hidden py-2.5 pr-3 align-middle xl:table-cell"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={t("transactions.rowActions")}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-surface-overlay hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100 data-[state=open]:bg-surface-overlay data-[state=open]:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onView}>
                  <Eye />
                  {t("transactions.viewDetails")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onEdit}>
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
          </td>
        </tr>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onView}>
          <Eye />
          {t("transactions.viewDetails")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onEdit}>
          <Pencil />
          {t("transactions.editTransaction")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className={menuItemDestructive} onSelect={onDelete}>
          <Trash2 />
          {t("transactions.deleteTransaction")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function TransactionMobileRow({
  tx,
  onView,
}: {
  tx: Transaction;
  onView: () => void;
}) {
  const { t } = useTranslation("accounting");
  const { currency } = useCurrency();
  const txCurrency = resolveCurrency(tx.currency, currency);
  const typeColor =
    tx.type === "revenue" ? "var(--success)" : "var(--destructive)";

  return (
    <div className="flex items-stretch border-b border-border-subtle last:border-b-0">
      <button
        type="button"
        onClick={onView}
        className="min-w-0 flex-1 px-3 py-2 text-left active:bg-surface-raised"
      >
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium text-foreground">
                {tx.description}
              </span>
              {tx.isRecurring && (
                <RotateCw
                  size={10}
                  strokeWidth={2.5}
                  className="shrink-0 text-muted-foreground opacity-60"
                />
              )}
              {tx.source === "ai_receipt" && !tx.reviewedAt && (
                <AiBadge
                  label={t("transactions.aiReview")}
                  className="h-4 shrink-0 py-0"
                />
              )}
            </span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground">
              <span className="tabular-nums">
                {formatCalendarDate(tx.date)}
              </span>
              <span className="text-border-strong">·</span>
              <span
                className="shrink-0 rounded px-1 text-2xs font-medium leading-[1.4] capitalize"
                style={{
                  color: STATUS_COLOR[tx.status],
                  background: STATUS_COLOR_SOFT[tx.status],
                }}
              >
                {t(`transactions.${STATUS_LABEL_KEY[tx.status]}`)}
              </span>
            </span>
          </span>
          <span
            className="shrink-0 text-sm font-semibold tabular-nums"
            style={{ color: typeColor }}
          >
            {formatAmount(tx, txCurrency.symbol)}
          </span>
        </span>
      </button>
    </div>
  );
}

function LoadMoreSentinel({
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation("accounting");
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (!hasMore && !isLoadingMore) return null;

  return (
    <tr ref={ref}>
      <td colSpan={6} className="px-4 py-4 text-center">
        {isLoadingMore && (
          <span className="text-xs text-muted-foreground">
            {t("transactions.loadingMore")}
          </span>
        )}
      </td>
    </tr>
  );
}

export function TransactionList({
  transactions,
  onView,
  onEdit,
  onDelete,
  onAddFirst,
  toolbar,
  emptyMessage,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: {
  transactions: Transaction[];
  onView: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onAddFirst?: () => void;
  toolbar?: React.ReactNode;
  emptyMessage?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const { t } = useTranslation("accounting");
  const resolvedEmptyMessage = emptyMessage ?? t("transactions.noneYet");

  if (transactions.length === 0) {
    return (
      <>
        {toolbar && <div className="mb-3">{toolbar}</div>}
        <div className="list-shell">
          <EmptyState
            icon={Receipt}
            title={resolvedEmptyMessage}
            description={
              resolvedEmptyMessage === t("transactions.noneYet")
                ? t("transactions.noneYetDescription")
                : undefined
            }
            action={
              onAddFirst &&
              resolvedEmptyMessage === t("transactions.noneYet") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddFirst}
                  className="gap-1.5"
                >
                  <Plus size={12} />
                  {t("transactions.addFirst")}
                </Button>
              )
            }
            className="px-4"
          />
        </div>
      </>
    );
  }

  return (
    <>
      {toolbar && <div className="mb-3">{toolbar}</div>}
      <div className="list-shell">
        <div className="md:hidden">
          {transactions.map((tx) => (
            <TransactionMobileRow
              key={tx.id}
              tx={tx}
              onView={() => onView(tx)}
            />
          ))}
          {onLoadMore && (hasMore || isLoadingMore) && (
            <div className="flex justify-center border-t border-border-subtle p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isLoadingMore}
                onClick={onLoadMore}
              >
                {isLoadingMore
                  ? t("transactions.loadingMore")
                  : t("transactions.loadMore")}
              </Button>
            </div>
          )}
        </div>
        <table className="hidden w-full table-fixed border-collapse md:table">
          <colgroup>
            <col className="w-28" />
            <col />
            <col className="w-30" />
            <col className="w-20" />
            <col className="w-22" />
            <col className="w-9" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle">
              <th className={`${TH} text-left`}>
                {t("transactions.table.date")}
              </th>
              <th className={`${TH} text-left`}>
                {t("transactions.table.description")}
              </th>
              <th className={`${TH} text-left`}>
                {t("transactions.table.category")}
              </th>
              <th className={`${TH} text-center`}>
                {t("transactions.table.status")}
              </th>
              <th className={`${TH} text-right`}>
                {t("transactions.table.amount")}
              </th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                isLast={
                  i === transactions.length - 1 && !hasMore && !isLoadingMore
                }
                onView={() => onView(tx)}
                onEdit={() => onEdit(tx)}
                onDelete={() => onDelete(tx)}
              />
            ))}
            {onLoadMore && (
              <LoadMoreSentinel
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={onLoadMore}
              />
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
