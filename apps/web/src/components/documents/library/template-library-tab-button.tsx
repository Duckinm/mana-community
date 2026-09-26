import { Layers, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useTranslation } from "react-i18next";

export function TabButton({
  active,
  icon,
  label,
  count,
  onClick,
  size = "sm",
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-3 font-medium transition-colors ${
        size === "md" ? "py-3.5 text-sm" : "py-3 text-xs"
      } ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={active ? "text-primary" : "text-caption"}>{icon}</span>
      {label}
      {count !== undefined && (
        <span
          className={`text-2xs tabular-nums ${
            active ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function EmptyTemplates({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation("documents");

  return (
    <div className="list-shell my-5 max-xl:mx-0 xl:mx-4 @xl:mx-6 @4xl:mx-10">
      <EmptyState
        icon={Layers}
        title={t("templateLibrary.noTemplatesYet")}
        description={t("templateLibrary.saveAnyLineItem")}
        action={
          <Button type="button" variant="outline" size="sm" onClick={onNew}>
            <Plus size={14} strokeWidth={2} />
            {t("templateLibrary.createFirstTemplate")}
          </Button>
        }
        className="px-4"
      />
    </div>
  );
}
