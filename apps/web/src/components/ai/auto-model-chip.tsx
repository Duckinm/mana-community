import { ManaSparkle } from "@/components/icons/mana-sparkle";
import { useTranslation } from "react-i18next";

/** Static "Auto" indicator — the server always picks the model, no user selection. */
export function AutoModelChip() {
  const { t } = useTranslation("chat");

  return (
    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface-raised text-muted-foreground">
      <ManaSparkle size={12} className="text-primary" />
      <span className="font-medium text-foreground">{t("model.auto")}</span>
    </span>
  );
}
