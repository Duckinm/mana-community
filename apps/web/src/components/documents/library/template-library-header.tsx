import { TabButton } from "@/components/documents/library/template-library-tab-button";
import type { TemplateLibraryTab } from "@/components/documents/library/template-library-types";
import { ExternalLink, Layers, Package, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import type { ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";

export function TemplateLibraryTabs({
  tab,
  templatesCount,
  packagesCount,
  insertMode,
  tabSize,
  extraTabs,
  onTabChange,
  onNewTemplate,
  onExpand,
}: {
  tab: TemplateLibraryTab;
  templatesCount: number;
  packagesCount: number;
  insertMode: boolean;
  tabSize: "sm" | "md";
  extraTabs: ReactNode;
  onTabChange: (tab: TemplateLibraryTab) => void;
  onNewTemplate: () => void;
  onExpand?: () => void;
}) {
  const { t } = useTranslation("documents");

  return (
    <div className="flex h-[52px] shrink-0 items-center border-b border-border-subtle px-3">
      <TabButton
        active={tab === "templates"}
        icon={<Layers size={12} />}
        label={t("libraryTabBar.templates")}
        count={templatesCount}
        size={tabSize}
        onClick={() => onTabChange("templates")}
      />
      <TabButton
        active={tab === "packages"}
        icon={<Package size={12} />}
        label={t("libraryTabBar.packages")}
        count={packagesCount}
        size={tabSize}
        onClick={() => onTabChange("packages")}
      />
      {extraTabs}
      <div className="ml-auto flex items-center gap-1 pr-2">
        {insertMode && tab === "templates" && (
          <button
            type="button"
            onClick={onNewTemplate}
            title={t("templateLibrary.newTemplateButton")}
            aria-label={t("templateLibrary.newTemplateButton")}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <Plus size={13} />
          </button>
        )}
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            title={t("templateLibrary.openLibraryPage")}
            aria-label={t("templateLibrary.openLibraryPage")}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <ExternalLink size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function TemplateLibraryPageActions({
  tab,
  showSearch,
  query,
  searchPlaceholder,
  searchRef,
  onQueryChange,
  onNew,
}: {
  tab: TemplateLibraryTab;
  showSearch: boolean;
  query: string;
  searchPlaceholder: string;
  searchRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onNew: () => void;
}) {
  const { t } = useTranslation("documents");
  const newLabel = t(
    tab === "packages"
      ? "templateLibrary.newPackageButton"
      : "templateLibrary.newTemplateButton",
  );

  return (
    <div className="flex shrink-0 items-center gap-2 px-4 pt-4 sm:px-6 lg:px-10">
      {showSearch && (
        <SearchBar
          value={query}
          onChange={onQueryChange}
          placeholder={searchPlaceholder}
          inputRef={searchRef}
          className="h-9 min-w-0 flex-1 sm:max-w-md"
        />
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onNew}
        className="size-9 shrink-0 px-0 sm:ml-auto sm:h-9 sm:w-auto sm:px-3"
        aria-label={newLabel}
        title={newLabel}
      >
        <Plus size={16} strokeWidth={2.5} />
        <span className="hidden sm:inline">{newLabel}</span>
      </Button>
    </div>
  );
}
