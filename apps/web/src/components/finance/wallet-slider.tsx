import type { Wallet } from "@/components/finance/types";
import {
  WalletCard,
  walletSelectedRing,
} from "@/components/finance/wallet-card";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plus } from "@/components/icons";
import { useTranslation } from "react-i18next";

interface WalletSliderProps {
  wallets: Wallet[];
  selectedWalletId: string | null;
  onSelect: (walletId: string | null) => void;
  onAddWallet: () => void;
}

function SliderItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("snap-start shrink-0 py-1.5", className)}>{children}</div>
  );
}

export function WalletSlider({
  wallets,
  selectedWalletId,
  onSelect,
  onAddWallet,
}: WalletSliderProps) {
  const { t } = useTranslation("accounting");
  return (
    <div className="relative">
      {/* scroll affordance — the strip is wider than the content column on most viewports */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-linear-to-l from-bg to-transparent" />
      <div className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory scroll-px-1.5">
      <SliderItem className="pl-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          style={{
            boxShadow:
              selectedWalletId === null
                ? walletSelectedRing("var(--primary)")
                : undefined,
          }}
          className={`w-32 h-32 rounded-2xl px-4 py-4 flex flex-col justify-between text-left transition-all duration-base ${
            selectedWalletId === null
              ? "bg-primary-soft"
              : "border border-border-subtle bg-card hover:-translate-y-0.5 hover:bg-surface-raised"
          }`}
        >
          <div className="flex items-center justify-center rounded-md bg-surface-raised w-7 h-5">
            <LayoutGrid
              size={13}
              strokeWidth={2}
              className="text-muted-foreground"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{t("wallets.allWallets")}</p>
            <p className="text-xs text-muted-foreground">{t("wallets.viewEverything")}</p>
          </div>
        </button>
      </SliderItem>

      {wallets.map((wallet) => (
        <SliderItem key={wallet.id}>
          <WalletCard
            wallet={wallet}
            size="sm"
            selected={wallet.id === selectedWalletId}
            onClick={() => onSelect(wallet.id)}
            className={
              wallet.id === selectedWalletId
                ? "w-52 h-32"
                : "w-52 h-32 opacity-90 hover:opacity-100"
            }
          />
        </SliderItem>
      ))}

      <SliderItem className="pr-1.5">
        <button
          type="button"
          onClick={onAddWallet}
          className="w-32 h-32 rounded-2xl border border-dashed border-border-strong flex flex-col items-center justify-center gap-1.5 text-muted-foreground transition-all duration-base hover:bg-surface-raised hover:text-foreground hover:-translate-y-0.5"
        >
          <Plus size={16} strokeWidth={2} />
          <span className="text-xs font-medium">{t("wallets.addWallet")}</span>
        </button>
        </SliderItem>
      </div>
    </div>
  );
}
