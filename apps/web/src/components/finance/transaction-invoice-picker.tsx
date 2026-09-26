import type { Document } from "@/components/documents/types";
import { formatSignedAmount } from "@/components/finance/transaction-modal-helpers";
import { Check, FileText, Search } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface TransactionInvoicePickerProps {
  documents: Document[];
  documentId: string;
  reference: string;
  onReferenceChange: (value: string) => void;
  onLinkChange: (documentId: string) => void;
  projectId?: string;
  referenceError?: string;
}

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "muted"
> = {
  paid: "success",
  published: "warning",
  overdue: "danger",
  draft: "muted",
  archived: "muted",
};

export function TransactionInvoicePicker({
  documents,
  documentId,
  reference,
  onReferenceChange,
  onLinkChange,
  projectId,
  referenceError,
}: TransactionInvoicePickerProps) {
  const { t } = useTranslation("accounting");
  const { currency } = useCurrency();
  const [open, setOpen] = useState(false);

  const publishedInvoices = useMemo(
    () =>
      documents.filter(
        (doc) =>
          doc.status !== "draft" &&
          doc.status !== "archived" &&
          (!projectId || doc.projectId === projectId),
      ),
    [documents, projectId],
  );

  const linked = documentId
    ? documents.find((doc) => doc.id === documentId)
    : undefined;

  const matchesKnown = publishedInvoices.some(
    (doc) => doc.number.toLowerCase() === reference.trim().toLowerCase(),
  );

  const suggestions = useMemo(() => {
    const q = reference.trim().toLowerCase();
    if (!q) return publishedInvoices.slice(0, 6);
    return publishedInvoices
      .filter((doc) => doc.number.toLowerCase().includes(q))
      .slice(0, 6);
  }, [publishedInvoices, reference]);

  function pick(doc: Document) {
    onLinkChange(doc.id);
    onReferenceChange(doc.number);
    setOpen(false);
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <Input
            id="reference"
            aria-label={t("transactions.modal.ref")}
            placeholder={t("transactions.modal.refPlaceholder")}
            value={reference}
            onChange={(e) => {
              onReferenceChange(e.target.value);
              if (linked && e.target.value !== linked.number) onLinkChange("");
              if (!open) setOpen(true);
            }}
            className={cn(
              "pr-9",
              referenceError && "border-destructive/60 focus:border-destructive",
            )}
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("transactions.modal.browseInvoices")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <Search size={14} />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent
          align="end"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-72 p-1"
        >
          {suggestions.length === 0 ? (
            <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
              {t("transactions.modal.noInvoicesMatch")}
            </p>
          ) : (
            <div
              className="max-h-64 overflow-y-auto"
              onWheel={(e) => e.stopPropagation()}
            >
              {suggestions.map((doc) => {
                const active = doc.id === documentId;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => pick(doc)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-fast hover:bg-accent"
                  >
                    <FileText
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {doc.number}
                      </span>
                      <span className="block truncate text-2xs text-muted-foreground">
                        {formatSignedAmount(
                          doc.totalCents / 100,
                          doc.currency,
                          currency.symbol,
                        )}
                      </span>
                    </span>
                    <Badge
                      variant={STATUS_VARIANT[doc.status] ?? "muted"}
                      size="sm"
                    >
                      {doc.status}
                    </Badge>
                    {active && (
                      <Check size={13} className="shrink-0 text-success" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {referenceError ? (
        <p className="mt-1 text-xs text-destructive">{referenceError}</p>
      ) : linked ? (
        <Badge variant="success" size="sm" className="mt-1.5">
          <FileText size={9} />{" "}
          {t("transactions.modal.linked", { number: linked.number })}
        </Badge>
      ) : (
        reference.trim() &&
        !matchesKnown && (
          <p className="mt-1 text-xs text-warning">
            {t("transactions.modal.noInvoiceMatchesRef")}
          </p>
        )
      )}
    </div>
  );
}
