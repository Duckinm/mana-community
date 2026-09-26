import { PAYMENT_METHOD_LABELS } from "@/components/finance/constants";
import type { PaymentMethod, Wallet } from "@/components/finance/types";
import { activeThBanks } from "@/lib/th-banks";
import { cn } from "@/lib/utils";
import {
  Bitcoin,
  CreditCard,
  Landmark,
  Money,
  QrCode,
  Star,
  Wallet as WalletIcon,
} from "@/components/icons";
import { useTranslation } from "react-i18next";

const WALLET_TYPE_ICONS: Record<PaymentMethod, typeof Landmark> = {
  bank_transfer: Landmark,
  cash: Money,
  card: CreditCard,
  promptpay: QrCode,
  crypto: Bitcoin,
  other: WalletIcon,
};

export function walletSelectedRing(color: string) {
  return `0 0 0 2px var(--surface-page), 0 0 0 4px ${color}`;
}

function localizedBankName(wallet: Wallet, language: string) {
  const bankName = wallet.bankName ?? wallet.name;
  const bank = activeThBanks.find(
    (bank) =>
      bank.nameEn === bankName ||
      bank.officialNameEn === bankName ||
      bank.nameTh === bankName,
  );

  if (!bank) return null;
  return language.startsWith("th") ? bank.nameTh : bank.nameEn;
}

interface WalletCardProps {
  wallet: Wallet;
  selected?: boolean;
  size?: "sm" | "lg";
  className?: string;
  onClick?: () => void;
}

export function WalletCard({
  wallet,
  selected,
  size = "sm",
  className,
  onClick,
}: WalletCardProps) {
  const { t, i18n } = useTranslation("accounting");
  const Icon = WALLET_TYPE_ICONS[wallet.type as PaymentMethod];
  const isSmall = size === "sm";
  const walletTypeLabel = t(`walletManager.methods.${wallet.type}`);
  const walletTypeWordmark = t(`walletManager.wordmarks.${wallet.type}`);
  const displayName =
    wallet.type === "bank_transfer"
      ? localizedBankName(wallet, i18n.language) ?? wallet.name
      : wallet.name === PAYMENT_METHOD_LABELS[wallet.type as PaymentMethod]
        ? walletTypeLabel
        : wallet.name;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${wallet.color} 0%, color-mix(in srgb, ${wallet.color} 55%, var(--surface-page)) 100%)`,
        boxShadow: selected ? walletSelectedRing(wallet.color) : undefined,
      }}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl text-left transition-all duration-base",
        "flex flex-col justify-between",
        isSmall ? "w-52 h-32 p-4" : "w-full aspect-[1.586] p-5",
        !selected && "hover:-translate-y-0.5 hover:shadow-card-hover",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 w-32 h-32 rounded-full opacity-30 blur-2xl"
        style={{ background: "white" }}
      />
      <div
        className="pointer-events-none absolute -left-10 bottom-0 w-28 h-28 rounded-full opacity-20 blur-2xl"
        style={{ background: "black" }}
      />

      <div className="relative flex items-start justify-between">
        <div
          className="flex items-center justify-center rounded-md bg-white/25 backdrop-blur-sm"
          style={{ width: isSmall ? 26 : 34, height: isSmall ? 20 : 26 }}
        >
          <Icon
            size={isSmall ? 13 : 16}
            strokeWidth={2}
            className="text-white"
          />
        </div>
        {wallet.isDefault && (
          <span className="flex items-center gap-0.5 rounded-md bg-white/25 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
            <Star size={9} strokeWidth={2.5} className="fill-current" />
            {isSmall ? "" : t("wallets.default")}
          </span>
        )}
      </div>

      <div className="relative space-y-1">
        {wallet.lastFour ? (
          <p
            className={cn(
              "font-mono tabular-nums text-white/90",
              isSmall ? "text-sm" : "text-lg",
            )}
            style={{ letterSpacing: "0.18em" }}
          >
            •••• {wallet.lastFour}
          </p>
        ) : (
          <p className={cn("text-white/70", isSmall ? "text-2xs" : "text-xs")}>
            {walletTypeWordmark}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "font-medium text-white truncate",
              isSmall ? "text-sm" : "text-base",
            )}
          >
            {displayName}
          </p>
          {displayName !== walletTypeWordmark && (
            <p
              className={cn(
                "font-serif italic text-white/80 shrink-0",
                isSmall ? "text-xs" : "text-sm",
              )}
            >
              {walletTypeWordmark}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
