import type { TransactionType } from "@/components/finance/types";
import { ArrowDown, ArrowUp } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface TransactionTypeCardsProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

export function TransactionTypeCards({
  value,
  onChange,
}: TransactionTypeCardsProps) {
  const { t } = useTranslation("accounting");
  const CARDS: {
    type: TransactionType;
    label: string;
    hint: string;
    icon: typeof ArrowDown;
    accent: string;
    soft: string;
    border: string;
  }[] = [
    {
      type: "revenue",
      label: t("transactions.modal.incomeLabel"),
      hint: t("transactions.modal.incomeHint"),
      icon: ArrowDown,
      accent: "var(--success)",
      soft: "var(--success-soft)",
      border: "var(--success-border)",
    },
    {
      type: "expense",
      label: t("transactions.modal.expenseLabel"),
      hint: t("transactions.modal.expenseHint"),
      icon: ArrowUp,
      accent: "var(--destructive)",
      soft: "var(--danger-soft)",
      border: "var(--destructive)",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {CARDS.map((card) => {
        const active = value === card.type;
        const Icon = card.icon;
        return (
          <button
            key={card.type}
            type="button"
            onClick={() => onChange(card.type)}
            aria-pressed={active}
            className={cn(
              "group flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-base",
              active
                ? "border-transparent"
                : "border-border-subtle hover:border-border-default",
            )}
            style={
              active
                ? {
                    background: card.soft,
                    borderColor: card.border,
                    boxShadow: `inset 0 0 0 1px ${card.border}`,
                  }
                : undefined
            }
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-base"
              style={{
                background: active ? card.accent : "var(--surface-raised)",
              }}
            >
              <Icon
                size={16}
                strokeWidth={2.5}
                style={{ color: active ? "var(--primary-foreground)" : card.accent }}
              />
            </span>
            <span className="min-w-0">
              <span
                className="block text-sm font-semibold"
                style={{ color: active ? card.accent : "var(--text-primary)" }}
              >
                {card.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {card.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
