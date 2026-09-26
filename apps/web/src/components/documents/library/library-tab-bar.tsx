import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type LibraryTab = "templates" | "packages" | "business";

const TABS: { value: LibraryTab; labelKey: string; shortKey?: string }[] = [
  { value: "templates", labelKey: "templates" },
  { value: "packages", labelKey: "packages" },
  { value: "business", labelKey: "identity", shortKey: "identityShort" },
];

export function LibraryTabBar({
  tab,
  onTabChange,
}: {
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
}) {
  const { t } = useTranslation("documents");

  return (
    <header className="shrink-0 px-4 pt-4 sm:px-6 lg:px-10 lg:pt-8">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h1 className="shrink-0 text-xl font-semibold tracking-tight text-foreground">
            {t("libraryTabBar.title")}
          </h1>
          <p className="truncate text-xs text-muted-foreground max-xl:sr-only">
            {t("libraryTabBar.description")}
          </p>
        </div>
        <nav
          aria-label={t("libraryTabBar.title")}
          className="grid w-full max-w-full grid-cols-3 gap-1.5 rounded-xl bg-muted p-1 sm:inline-flex sm:w-fit"
        >
          {TABS.map((item) => {
            const active = tab === item.value;
            const full = t(`libraryTabBar.${item.labelKey}`);
            const short = item.shortKey
              ? t(`libraryTabBar.${item.shortKey}`)
              : full;

            return (
              <button
                key={item.value}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onTabChange(item.value)}
                className={cn(
                  "min-w-0 rounded-lg px-1.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all sm:px-3.5",
                  active
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{full}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
