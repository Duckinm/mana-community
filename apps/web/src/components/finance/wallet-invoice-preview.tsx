import type { PaymentMethod } from "@/components/finance/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface WalletInvoicePreviewProps {
  active: boolean;
  type: PaymentMethod;
  bankName: string;
  accountNumber: string;
  accountName: string;
  promptPayId: string;
  cardNumber: string;
}

export function WalletInvoicePreview({
  active,
  type,
  bankName,
  accountNumber,
  accountName,
  promptPayId,
  cardNumber,
}: WalletInvoicePreviewProps) {
  const { t } = useTranslation("accounting");

  const primary =
    type === "promptpay"
      ? promptPayId
      : type === "card"
        ? cardNumber
        : bankName;
  const secondary =
    type === "promptpay"
      ? t("walletManager.methods.promptpay")
      : type === "card"
        ? t("walletManager.methods.card")
        : accountNumber;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-3">
      <p className="mb-2 text-2xs uppercase tracking-widest text-caption">
        {t("walletManager.preview.invoiceFooterLabel")}
      </p>
      <div className="rounded-lg border border-border-subtle bg-surface-card px-3 py-2.5">
        <div className="flex items-center justify-between border-b border-border-subtle pb-1.5">
          <span className="h-1.5 w-16 rounded-full bg-border-strong" />
          <span className="h-1.5 w-10 rounded-full bg-border-subtle" />
        </div>
        <div
          className={cn(
            "mt-2 transition-opacity duration-base",
            active ? "opacity-100" : "opacity-30",
          )}
        >
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("walletManager.preview.payTo")}
          </p>
          {active ? (
            <div className="mt-0.5">
              <p className="truncate text-xs font-medium text-foreground">
                {primary || t(`walletManager.methods.${type}`)}
              </p>
              {secondary && (
                <p className="truncate font-mono text-2xs tabular-nums text-muted-foreground">
                  {secondary}
                </p>
              )}
              {accountName && type !== "promptpay" && (
                <p className="truncate text-2xs text-muted-foreground">
                  {accountName}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-1 space-y-1">
              <span className="block h-1.5 w-24 rounded-full bg-border-subtle" />
              <span className="block h-1.5 w-16 rounded-full bg-border-subtle" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
