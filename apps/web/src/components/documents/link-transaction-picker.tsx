import { formatCurrency } from "@/components/documents/utils";
import { TriangleAlert } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCalendarDate } from "@/lib/calendar-date";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface LinkTransactionPickerProps {
  documentId: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked: (result: { warning?: string }) => void;
}

export function LinkTransactionPicker({
  documentId,
  currency,
  open,
  onOpenChange,
  onLinked,
}: LinkTransactionPickerProps) {
  const { t } = useTranslation("documents");
  const [search, setSearch] = useState("");
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.transactionsList({
      unlinked: true,
      type: "revenue",
      q: search,
    }),
    queryFn: async () =>
      expectEden(
        await client.api.finance.transactions.get({
          query: {
            unlinked: "true",
            type: "revenue",
            q: search || undefined,
            limit: "20",
          },
        }),
      ),
    enabled: open,
  });

  const transactions = data?.data ?? [];

  async function handleSelect(transactionId: string) {
    setLinkingId(transactionId);
    try {
      const result = expectEden(
        await client.api
          .documents({ id: documentId })
          ["link-transaction"].post({ transactionId }),
      );
      onOpenChange(false);
      onLinked({ warning: result.warning });
    } finally {
      setLinkingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-md">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{t("linkTransaction.title")}</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("linkTransaction.searchPlaceholder")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("linkTransaction.loading")}
              </div>
            )}
            {!isLoading && transactions.length === 0 && (
              <CommandEmpty>
                {t("linkTransaction.noUnlinkedTransactions")}
              </CommandEmpty>
            )}
            <CommandGroup>
              {transactions.map((tx) => (
                <CommandItem
                  key={tx.id}
                  value={tx.id}
                  onSelect={() => handleSelect(tx.id)}
                  disabled={linkingId !== null}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-foreground">
                      {tx.description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCalendarDate(tx.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(
                        Math.round(tx.amount * 100),
                        tx.currency ?? currency,
                      )}
                    </span>
                    {linkingId === tx.id && (
                      <span className="text-xs text-muted-foreground">…</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function LinkTransactionWarningBanner({
  warning,
  onDismiss,
  onUnlink,
  unlinking,
}: {
  warning: string;
  onDismiss: () => void;
  onUnlink: () => void;
  unlinking?: boolean;
}) {
  const { t } = useTranslation("documents");
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft p-4">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-warning">
          {t("linkTransaction.amountMismatch")}
        </p>
        <p className="text-sm text-warning/90">{warning}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-warning hover:bg-warning/10 hover:text-warning"
          onClick={onUnlink}
          disabled={unlinking}
        >
          {unlinking
            ? t("linkTransaction.unlinking")
            : t("linkTransaction.unlinkTransaction")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-warning hover:bg-warning/10 hover:text-warning"
          onClick={onDismiss}
        >
          {t("linkTransaction.dismiss")}
        </Button>
      </div>
    </div>
  );
}
