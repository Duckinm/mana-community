import { PAYMENT_METHOD_LABELS } from "@/components/finance/constants";
import type { PaymentMethod, Wallet } from "@/components/finance/types";
import { WalletBrandMark } from "@/components/finance/wallet-brand-mark";
import {
  Bitcoin,
  CreditCard,
  Landmark,
  Money,
  QrCode,
  Wallet as WalletIcon,
} from "@/components/icons";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Label } from "@/components/ui/label";
import { detectCardBrand } from "@/lib/payment-destination-schema";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const WALLET_TYPE_ICONS: Record<PaymentMethod, typeof Landmark> = {
  bank_transfer: Landmark,
  cash: Money,
  card: CreditCard,
  promptpay: QrCode,
  crypto: Bitcoin,
  other: WalletIcon,
};

interface TransactionWalletChipsProps {
  wallets: Wallet[];
  value: string;
  onChange: (walletId: string) => void;
}

export function TransactionWalletChips({
  wallets,
  value,
  onChange,
}: TransactionWalletChipsProps) {
  const { t } = useTranslation("accounting");
  // slide 0 is the "no wallet" option; slides 1..n mirror `wallets`
  const items: (Wallet | null)[] = [null, ...wallets];
  const [api, setApi] = useState<CarouselApi>();
  const [startIndex] = useState(() => {
    const i = wallets.findIndex((w) => w.id === value);
    return i === -1 ? 0 : i + 1;
  });
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const i = api.selectedScrollSnap();
      setCurrent(i);
      const item = items[i];
      const id = item?.id ?? "";
      if (id !== value) onChange(id);
    };
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, wallets, onChange, value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{t("transactions.detail.wallet")}</Label>
        {items.length > 1 && (
          <div className="flex gap-1.5">
            {items.map((item, i) => (
              <button
                key={item?.id ?? "none"}
                type="button"
                aria-label={item?.name ?? t("transactions.modal.noWallet")}
                aria-pressed={i === current}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "size-1.5 rounded-full transition-colors duration-base",
                  i === current
                    ? "bg-foreground"
                    : "bg-muted-foreground/40 hover:bg-muted-foreground",
                )}
              />
            ))}
          </div>
        )}
      </div>
      <Carousel setApi={setApi} opts={{ startIndex }}>
        <CarouselContent>
          <CarouselItem>
            <div className="mx-auto flex aspect-[1.586] w-full max-w-72 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-strong bg-surface-raised p-4 text-muted-foreground">
              <WalletIcon size={20} strokeWidth={1.5} />
              <span className="text-sm font-medium">
                {t("transactions.modal.noWallet")}
              </span>
            </div>
          </CarouselItem>
          {wallets.map((wallet) => {
            const Icon = WALLET_TYPE_ICONS[wallet.type as PaymentMethod];
            const brand =
              wallet.type === "card" && wallet.lastFour
                ? detectCardBrand(wallet.lastFour)
                : "unknown";
            const displayName =
              wallet.name === PAYMENT_METHOD_LABELS[wallet.type as PaymentMethod]
                ? t(`walletManager.methods.${wallet.type}`)
                : wallet.name;
            return (
              <CarouselItem key={wallet.id}>
                <div
                  className="relative mx-auto flex aspect-[1.586] w-full max-w-72 flex-col justify-between overflow-hidden rounded-2xl p-4"
                  style={{
                    background: `linear-gradient(135deg, ${wallet.color} 0%, color-mix(in srgb, ${wallet.color} 55%, var(--surface-page)) 100%)`,
                  }}
                >
                  <span className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/25 opacity-60 blur-xl" />
                  <span className="relative flex items-center justify-between">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-white/25 backdrop-blur-sm">
                      <Icon size={16} strokeWidth={2} className="text-white" />
                    </span>
                    {wallet.type === "card" && <WalletBrandMark brand={brand} />}
                  </span>
                  <span className="relative min-w-0">
                    {wallet.lastFour && (
                      <span className="mb-1 block font-mono text-sm tracking-widest tabular-nums text-white/80">
                        •••• •••• •••• {wallet.lastFour}
                      </span>
                    )}
                    <span className="block max-w-full truncate text-base font-semibold text-white">
                      {displayName}
                    </span>
                  </span>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-0" />
        <CarouselNext className="right-0" />
      </Carousel>
    </div>
  );
}
