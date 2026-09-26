import { ChevronLeft } from "@/components/icons";
import { SheetDragRegion } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function MobileHeadline({
  title,
  onBack,
  trailing,
  className,
  backLabel,
}: {
  title: string;
  onBack: () => void;
  trailing?: ReactNode;
  className?: string;
  backLabel?: string;
}) {
  const { t } = useTranslation("common");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <SheetDragRegion
      className={cn(
        "relative z-10 flex min-h-16 shrink-0 items-center justify-center border-b border-border bg-card px-16 pb-5 pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))]",
        className,
      )}
    >
      <button
        type="button"
        aria-label={backLabel ?? t("goBack")}
        onClick={onBack}
        className="absolute left-2 flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-raised"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
      <p className="truncate text-center text-xl font-semibold tracking-normal text-foreground">
        {title}
      </p>
      {trailing ? (
        <div className="absolute right-3 flex max-w-28 items-center justify-end">
          {trailing}
        </div>
      ) : null}
    </SheetDragRegion>
  );
}
