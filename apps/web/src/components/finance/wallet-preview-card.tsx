import { WalletBrandMark } from "@/components/finance/wallet-brand-mark";
import type { PaymentMethod } from "@/components/finance/types";
import {
  Bitcoin,
  CreditCard,
  Landmark,
  Money,
  QrCode,
  Star,
  Wallet as WalletIcon,
} from "@/components/icons";
import { PAYMENT_METHOD_COLORS } from "@/components/finance/constants";
import {
  detectCardBrand,
  isValidCardNumber,
} from "@/lib/payment-destination-schema";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const TYPE_ICONS: Record<PaymentMethod, typeof Landmark> = {
  bank_transfer: Landmark,
  card: CreditCard,
  promptpay: QrCode,
  cash: Money,
  crypto: Bitcoin,
  other: WalletIcon,
};

export interface WalletPreviewValues {
  type: PaymentMethod;
  isDefault: boolean;
  bankName: string;
  accountNumber: string;
  cardNumber: string;
  cardholderName: string;
  cardExpiry: string;
  promptPayId: string;
}

function PromptPayQr() {
  const cells = 11;
  return (
    <div
      className="grid gap-px rounded-md bg-white p-1.5"
      style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}
      aria-hidden
    >
      {Array.from({ length: cells * cells }).map((_, i) => {
        const row = Math.floor(i / cells);
        const col = i % cells;
        const finder =
          (row < 3 && col < 3) ||
          (row < 3 && col > cells - 4) ||
          (row > cells - 4 && col < 3);
        const on = finder || (i * 2654435761) % 3 === 0;
        return (
          <span
            key={i}
            className={cn("aspect-square", on ? "bg-black" : "bg-transparent")}
          />
        );
      })}
    </div>
  );
}

export function WalletPreviewCard({ values }: { values: WalletPreviewValues }) {
  const { t } = useTranslation("accounting");
  const color = PAYMENT_METHOD_COLORS[values.type];
  const Icon = TYPE_ICONS[values.type];

  const digits = values.cardNumber.replace(/\D/g, "");
  const brand = detectCardBrand(values.cardNumber);
  const numberValid = isValidCardNumber(values.cardNumber);
  const brandRefused = digits.length >= 4 && !numberValid;

  const maskedNumber =
    digits.length > 0
      ? `•••• •••• •••• ${digits.slice(-4).padStart(4, "•")}`
      : "•••• •••• •••• ••••";

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 55%, var(--surface-page)) 100%)`,
      }}
      className="relative aspect-[1.586] w-full overflow-hidden rounded-2xl p-5 text-white"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white opacity-30 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-black opacity-20 blur-2xl"
        aria-hidden
      />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex h-[26px] w-[34px] items-center justify-center rounded-md bg-white/25 backdrop-blur-sm">
            <Icon size={16} strokeWidth={2} className="text-white" />
          </div>
          <div className="flex items-center gap-2">
            {values.isDefault && (
              <span className="flex items-center gap-0.5 rounded-md bg-white/25 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-widest backdrop-blur-sm">
                <Star size={9} strokeWidth={2.5} className="fill-current" />
                {t("wallets.default")}
              </span>
            )}
            {values.type === "card" &&
              (brandRefused ? (
                <span className="rounded-md bg-black/25 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-widest text-white/70 backdrop-blur-sm">
                  {t("walletManager.preview.invalidCard")}
                </span>
              ) : (
                <WalletBrandMark brand={brand} />
              ))}
          </div>
        </div>

        {values.type === "promptpay" ? (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-2xs uppercase tracking-widest text-white/70">
                {t("walletManager.methods.promptpay")}
              </p>
              <p className="truncate font-mono text-sm tabular-nums text-white/90">
                {values.promptPayId || "—"}
              </p>
            </div>
            <PromptPayQr />
          </div>
        ) : values.type === "card" ? (
          <div className="space-y-2">
            <p
              className="font-mono text-lg tabular-nums text-white/90"
              style={{ letterSpacing: "0.14em" }}
            >
              {maskedNumber}
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-base font-medium uppercase tracking-wide">
                {values.cardholderName || t("walletManager.cardholderName")}
              </p>
              <p className="shrink-0 font-mono text-sm tabular-nums text-white/80">
                {values.cardExpiry || "MM/YY"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {values.accountNumber && (
              <p
                className="font-mono text-lg tabular-nums text-white/90"
                style={{ letterSpacing: "0.14em" }}
              >
                {values.accountNumber}
              </p>
            )}
            <p className="truncate text-base font-medium">
              {values.bankName || t(`walletManager.methods.${values.type}`)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
