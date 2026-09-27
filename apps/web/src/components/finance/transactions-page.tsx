import { useCapabilities } from "@/hooks/use-capabilities";
import { CapabilityNotice } from "@/components/capability-notice";
import {
  STATUS_COLOR,
  STATUS_COLOR_SOFT,
} from "@/components/finance/constants";
import { importReceipts } from "@/components/finance/import-receipts";
import { ReceiptReviewBanner } from "@/components/finance/receipt-review-banner";
import { TransactionDetailModal } from "@/components/finance/transaction-detail-modal";
import { MobileTransactionFilterButton } from "@/components/finance/transaction-filter-drawer";
import { TransactionList } from "@/components/finance/transaction-list";
import { TransactionListSkeleton } from "@/components/finance/transaction-list-skeleton";
import { TransactionModal } from "@/components/finance/transaction-modal";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
  Wallet,
} from "@/components/finance/types";
import { useTransactionsInfinite } from "@/components/finance/use-transactions-infinite";
import { WalletManagerDialog } from "@/components/finance/wallet-manager-dialog";
import { WalletSlider } from "@/components/finance/wallet-slider";
import { WalletSliderSkeleton } from "@/components/finance/wallet-slider-skeleton";
import { Loader2, Plus, Receipt } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FilterPill, ResetPill } from "@/components/ui/filter-pill";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFinance } from "@/context/finance";
import { client, expectEden } from "@/lib/eden";
import { fadeUp, motionTransition, panelFadeUp } from "@/lib/motion";
import { queryKeys } from "@/lib/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const transactionsRoute = getRouteApi("/_app/accounting/transactions");
type TransactionSearch = ReturnType<typeof transactionsRoute.useSearch>;

const TYPE_FILTER_KEYS: { value: "all" | TransactionType; key: string }[] = [
  { value: "all", key: "typeAll" },
  { value: "revenue", key: "typeRevenue" },
  { value: "expense", key: "typeExpense" },
];

const STATUS_FILTER_KEYS: { value: "all" | TransactionStatus; key: string }[] =
  [
    { value: "all", key: "statusAll" },
    { value: "received", key: "statusReceived" },
    { value: "pending", key: "statusPending" },
    { value: "overdue", key: "statusOverdue" },
    { value: "paid", key: "statusPaid" },
  ];

export function TransactionsPage() {
  const { t } = useTranslation("accounting");
  const {
    budgetCategories,
    addBudgetCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useFinance();
  const {
    txId,
    q,
    type,
    status,
    walletId,
    from,
    to,
    needsReview = false,
  } = transactionsRoute.useSearch();
  const navigate = transactionsRoute.useNavigate();
  const queryClient = useQueryClient();
  const [walletSheetOpen, setWalletSheetOpen] = useState(false);
  const [viewTxId, setViewTxId] = useState<string | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const capabilities = useCapabilities();
  const [receiptImporting, setReceiptImporting] = useState(false);
  const [approvingReview, setApprovingReview] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const listFilters = { q, type, status, walletId, from, to, needsReview };
  const hasActiveFilters =
    type !== "all" ||
    status !== "all" ||
    !!walletId ||
    !!from ||
    !!to ||
    !!q.trim();

  const {
    data,
    isPending: listLoading,
    isError: listError,
    refetch: refetchList,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useTransactionsInfinite(listFilters);

  const transactions = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const viewTx = viewTxId
    ? transactions.find((tx) => tx.id === viewTxId)
    : undefined;

  const categoryUsage = transactions.reduce<Record<string, number>>(
    (acc, tx) => {
      const key = tx.category?.trim().toLowerCase();
      if (key) acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const { data: wallets = [], isLoading: walletsLoading } = useQuery<Wallet[]>({
    queryKey: queryKeys.wallets,
    queryFn: async () => {
      const result = await client.api.wallets.get();
      if (result.error) throw result.error;
      return (result.data ?? []) as unknown as Wallet[];
    },
    staleTime: 60_000,
  });

  const { data: editTx } = useQuery({
    queryKey: queryKeys.transaction(txId ?? ""),
    queryFn: async () =>
      expectEden(await client.api.finance.transactions({ id: txId! }).get()),
    enabled: !!txId && txId !== "new",
  });

  const modalInitialData = txId === "new" || !txId ? {} : (editTx ?? {});

  const TYPE_FILTERS = TYPE_FILTER_KEYS.map((f) => ({
    value: f.value,
    label: t(`transactions.${f.key}`),
  }));
  const STATUS_FILTERS = STATUS_FILTER_KEYS.map((f) => ({
    value: f.value,
    label: t(`transactions.${f.key}`),
  }));

  const modalOpen = txId !== undefined;
  const openModal = useCallback(
    (tx?: Partial<Transaction>) => {
      navigate({
        search: (prev: TransactionSearch) => ({ ...prev, txId: tx?.id ?? "new" }),
        resetScroll: false,
      });
    },
    [navigate],
  );
  const closeModal = useCallback(() => {
    navigate({
      search: (prev: TransactionSearch) => ({ ...prev, txId: undefined }),
      resetScroll: false,
    });
  }, [navigate]);
  const handleSave = useCallback(
    async (tx: Transaction | Omit<Transaction, "id">) => {
      try {
        if ("id" in tx && tx.id) await updateTransaction(tx);
        else await addTransaction(tx);
        closeModal();
      } catch {
        toast.error(t("toast.saveTransactionFailed"));
      }
    },
    [addTransaction, closeModal, t, updateTransaction],
  );

  async function handleReceiptImport(files: File[]) {
    setReceiptImporting(true);
    try {
      const results = await importReceipts(files);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles }),
      ]);

      const imported = results.filter((r) => r.transaction);
      const failed = results.filter((r) => r.error);

      // A single import lands the user straight in the draft; a batch would fight itself.
      if (imported.length === 1 && failed.length === 0) {
        navigate({
          search: (prev) => ({ ...prev, txId: imported[0].transaction!.id }),
          resetScroll: false,
        });
      }

      if (imported.length > 0) {
        toast.success(
          imported.length === 1
            ? t("transactions.receiptImportSuccess")
            : t("transactions.receiptImportSuccessMany", {
                count: imported.length,
              }),
          { description: t("transactions.receiptImportReview") },
        );
      }

      for (const { file, error } of failed) {
        toast.error(t("transactions.receiptImportFailed"), {
          description:
            files.length > 1 && error ? `${file.name} — ${error}` : error,
        });
      }
    } finally {
      setReceiptImporting(false);
    }
  }

  const { data: pendingReview } = useQuery({
    queryKey: queryKeys.transactionsList({ needsReview: true, limit: 1 }),
    queryFn: async () =>
      expectEden(
        await client.api.finance.transactions.get({
          query: { needsReview: "true", limit: "1" },
        }),
      ),
  });
  const pendingReviewCount = pendingReview?.total ?? 0;

  async function handleApproveAll() {
    setApprovingReview(true);
    try {
      const { reviewed } = expectEden(
        await client.api.finance.transactions["bulk-review"].post({}),
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transactions,
      });
      if (needsReview) {
        navigate({
          search: (prev) => ({ ...prev, needsReview: false }),
          resetScroll: false,
        });
      }
      toast.success(t("transactions.reviewQueueApproved", { count: reviewed }));
    } catch (err) {
      toast.error(t("transactions.reviewQueueApproveFailed"), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setApprovingReview(false);
    }
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBar
        value={q}
        onChange={(value) =>
          navigate({
            search: (prev) => ({ ...prev, q: value }),
            replace: true,
            resetScroll: false,
          })
        }
        placeholder={t("transactions.searchPlaceholder")}
        className="min-w-0 flex-1 basis-40"
      />

      <div className="min-w-0 sm:hidden">
        <MobileTransactionFilterButton
          filter={{ type, status, from, to }}
          onChange={(next) =>
            navigate({
              search: (prev) => ({ ...prev, ...next }),
              resetScroll: false,
            })
          }
        />
      </div>

      <div className="hidden flex-wrap items-center gap-1 sm:flex">
        <FilterPill
          label={t("transactions.filterType")}
          options={TYPE_FILTERS}
          value={type}
          defaultValue="all"
          onChange={(v) =>
            navigate({
              search: (prev) => ({ ...prev, type: v }),
              resetScroll: false,
            })
          }
        />
        <FilterPill
          label={t("transactions.filterStatus")}
          options={STATUS_FILTERS}
          value={status}
          defaultValue="all"
          onChange={(v) =>
            navigate({
              search: (prev) => ({ ...prev, status: v }),
              resetScroll: false,
            })
          }
          getColor={(v) => STATUS_COLOR[v as TransactionStatus]}
          getSoftColor={(v) => STATUS_COLOR_SOFT[v as TransactionStatus]}
        />
        <DateRangePicker
          className="h-9"
          placeholder={t("transactions.dateRange")}
          from={from}
          to={to}
          onFromChange={(v) =>
            navigate({
              search: (prev) => ({ ...prev, from: v }),
              replace: true,
              resetScroll: false,
            })
          }
          onToChange={(v) =>
            navigate({
              search: (prev) => ({ ...prev, to: v }),
              replace: true,
              resetScroll: false,
            })
          }
          onClear={() =>
            navigate({
              search: (prev) => ({
                ...prev,
                from: undefined,
                to: undefined,
              }),
              replace: true,
              resetScroll: false,
            })
          }
        />
        {(type !== "all" || status !== "all" || from || to) && (
          <ResetPill
            onClick={() =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  type: "all",
                  status: "all",
                  from: undefined,
                  to: undefined,
                }),
                resetScroll: false,
              })
            }
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="page-scroll pb-6 pt-5 max-xl:pb-mobile-dock xl:pb-8 xl:pt-8">
      <div className="page-pad mx-auto w-full max-w-3xl">
        <motion.div {...fadeUp} className="mb-5 max-xl:mb-3">
          <CapabilityNotice available={capabilities.data?.ai} unavailableKey="receiptUnavailable" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {t("transactions.pageTitle")}
              </h1>
              <p className="text-xs text-muted-foreground max-xl:sr-only">
                {t(
                  total === 1
                    ? "transactions.countOne"
                    : "transactions.countMany",
                  {
                    count: transactions.length,
                    total,
                  },
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <input
                ref={receiptInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                  if (files.length > 0) void handleReceiptImport(files);
                }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={receiptImporting || capabilities.isError || !capabilities.data?.ai}
                    aria-label={t("transactions.importReceipt")}
                    className="size-9 shrink-0 px-0 [@media(pointer:coarse)]:size-9 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3 [@media(pointer:coarse)]:sm:h-8 [@media(pointer:coarse)]:sm:w-auto"
                  >
                    {receiptImporting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Receipt size={14} strokeWidth={2.5} />
                    )}
                    <span className="hidden sm:inline">
                      {t("transactions.importReceipt")}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  {t("transactions.importReceipt")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModal()}
                    aria-label={t("transactions.newTransaction")}
                    className="size-9 shrink-0 px-0 [@media(pointer:coarse)]:size-9 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3 [@media(pointer:coarse)]:sm:h-8 [@media(pointer:coarse)]:sm:w-auto"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span className="hidden sm:inline">
                      {t("transactions.newTransaction")}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  {t("transactions.newTransaction")}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </motion.div>

        <motion.div
          {...panelFadeUp}
          transition={motionTransition(undefined, 0.05)}
          className="mb-3 sm:mb-6"
        >
          {walletsLoading ? (
            <WalletSliderSkeleton />
          ) : (
            <WalletSlider
              wallets={wallets}
              selectedWalletId={walletId ?? null}
              onSelect={(id) =>
                navigate({
                  search: (prev) => ({ ...prev, walletId: id ?? undefined }),
                  resetScroll: false,
                })
              }
              onAddWallet={() => setWalletSheetOpen(true)}
            />
          )}
        </motion.div>

        <motion.div
          {...panelFadeUp}
          transition={motionTransition(undefined, 0.1)}
        >
          {pendingReviewCount > 0 && (
            <ReceiptReviewBanner
              count={pendingReviewCount}
              filtered={needsReview}
              approving={approvingReview}
              onToggleFilter={() =>
                navigate({
                  search: (prev) => ({ ...prev, needsReview: !needsReview }),
                  resetScroll: false,
                })
              }
              onApproveAll={() => void handleApproveAll()}
            />
          )}
          {listLoading ? (
            <TransactionListSkeleton toolbar={toolbar} />
          ) : listError ? (
            <QueryErrorPanel onRetry={() => void refetchList()} />
          ) : (
            <TransactionList
              transactions={transactions}
              onView={(tx) => setViewTxId(tx.id)}
              onEdit={openModal}
              onDelete={setDeleteTx}
              onAddFirst={openModal}
              toolbar={toolbar}
              emptyMessage={
                hasActiveFilters
                  ? t("transactions.noMatchFilters")
                  : t("transactions.noneYet")
              }
              hasMore={!!hasNextPage}
              isLoadingMore={isFetchingNextPage}
              onLoadMore={() => void fetchNextPage()}
            />
          )}
        </motion.div>

        {viewTx && (
          <TransactionDetailModal
            tx={viewTx}
            wallets={wallets}
            onClose={() => setViewTxId(null)}
            onEdit={() => openModal(viewTx)}
            onDelete={() => setDeleteTx(viewTx)}
          />
        )}

        <DeleteConfirmDialog
          open={!!deleteTx}
          onOpenChange={(open) => {
            if (!open) setDeleteTx(null);
          }}
          title={t("transactions.modal.deleteConfirm")}
          onConfirm={() => {
            if (!deleteTx) return;
            const id = deleteTx.id;
            void deleteTransaction(id)
              .then(() => {
                setViewTxId((current) => (current === id ? null : current));
              })
              .catch(() => {
                // toast handled in finance provider
              });
          }}
        />

        {modalOpen && (txId === "new" || editTx) && (
          <TransactionModal
            key={txId}
            initialData={modalInitialData}
            budgetCategories={budgetCategories}
            categoryUsage={categoryUsage}
            wallets={wallets}
            onAddBudgetCategory={addBudgetCategory}
            onSave={handleSave}
            onDelete={async (id) => {
              try {
                await deleteTransaction(id);
                closeModal();
              } catch {
                // toast handled in finance provider
              }
            }}
            onClose={closeModal}
          />
        )}

        <WalletManagerDialog
          open={walletSheetOpen}
          onOpenChange={setWalletSheetOpen}
          wallets={wallets}
        />
      </div>
    </div>
  );
}
