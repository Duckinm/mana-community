import { TemplateLibraryPackageList } from "@/components/documents/library/template-library-package-list";
import {
  TemplateLibraryPageActions,
  TemplateLibraryTabs,
} from "@/components/documents/library/template-library-header";
import { TemplateLibraryRightPanel } from "@/components/documents/library/template-library-right-panel";
import {
  EmptyTemplates,
  TabButton,
} from "@/components/documents/library/template-library-tab-button";
import { TemplateLibraryTemplateList } from "@/components/documents/library/template-library-template-list";
import {
  parseSort,
  templateToInsert,
  type RightPanel,
  type SortField,
  type TemplateInsertItem,
  type TemplateLibraryPanelProps,
  type TemplateLibraryTab,
} from "@/components/documents/library/template-library-types";
import {
  PackageGridSkeleton,
} from "@/components/documents/library/package-card-skeleton";
import { TemplateGridSkeleton } from "@/components/documents/library/template-row-skeleton";
import type { Document } from "@/components/documents/types";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { SearchBar } from "@/components/ui/search-bar";
import { useDraftDocuments } from "@/hooks/use-draft-documents";
import {
  LIBRARY_PAGE_SIZE,
  useInfiniteSlice,
} from "@/hooks/use-infinite-slice";
import { useInsertIntoDocument } from "@/hooks/use-insert-into-document";
import {
  useItemTemplateGroups,
  type ItemTemplateGroup,
} from "@/hooks/use-item-template-groups";
import { useItemTemplates } from "@/hooks/use-item-templates";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export { GROUP_COLORS } from "@/components/documents/library/group-colors";
export {
  formatPrice,
  formatQty,
} from "@/components/documents/library/template-helpers";
export { EmptyTemplates, TabButton };
export type { TemplateLibraryPanelProps, TemplateLibraryTab };

const listSkeletonClass =
  "my-5 list-shell max-xl:mx-0 xl:mx-4 @xl:mx-6 @4xl:mx-10";

export function TemplateLibraryView({
  tab,
  onTabChange,
  onInsert,
  currency = "THB",
  onExpand,
  extraTabs,
  hideTabBar = false,
  tabSize = "sm",
  fitContent = false,
  query: queryProp,
  onQueryChange,
  sort: sortProp,
  onSortChange,
}: TemplateLibraryPanelProps) {
  const { t } = useTranslation("documents");
  const { templates, isLoading: templatesLoading, deleteTemplate } =
    useItemTemplates();
  const { groups, isLoading: groupsLoading, deleteGroup } =
    useItemTemplateGroups();
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: "template" | "package";
    id: string;
  } | null>(null);
  const [internalQuery, setInternalQuery] = useState("");
  const [internalSort, setInternalSort] = useState("name-asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rightPanel, setRightPanel] = useState<RightPanel>({ type: "none" });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { insert: insertInto } = useInsertIntoDocument();
  const { drafts } = useDraftDocuments();

  const query = queryProp ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;
  const defaultSort = tab === "packages" ? "updated-desc" : "name-asc";
  const sort = sortProp ?? internalSort;
  const setSort = onSortChange ?? setInternalSort;
  const [sortField, sortDir] = parseSort(sort, defaultSort);
  const insertMode = !!onInsert;
  const activePanel = rightPanel.type === "none" ? null : rightPanel;
  const isLoading = templatesLoading || groupsLoading;

  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );
  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return templates;

    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(normalizedQuery) ||
        template.description.toLowerCase().includes(normalizedQuery),
    );
  }, [query, templates]);
  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return groups;

    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(normalizedQuery) ||
        group.description.toLowerCase().includes(normalizedQuery) ||
        group.templates.some(
          (template) =>
            template.name.toLowerCase().includes(normalizedQuery) ||
            template.description.toLowerCase().includes(normalizedQuery),
        ),
    );
  }, [groups, query]);
  const direction = sortDir === "asc" ? 1 : -1;
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((left, right) => {
      if (sortField === "price") {
        return direction * (left.defaultUnitPriceCents - right.defaultUnitPriceCents);
      }
      if (sortField === "qty") {
        return direction * (left.defaultQty - right.defaultQty);
      }
      return direction * left.name.localeCompare(right.name);
    });
  }, [direction, filteredTemplates, sortField]);
  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((left, right) => {
      if (sortField === "items") {
        return direction * (left.templates.length - right.templates.length);
      }
      if (sortField === "updated") {
        return direction * (Date.parse(left.updatedAt) - Date.parse(right.updatedAt));
      }
      return direction * left.name.localeCompare(right.name);
    });
  }, [direction, filteredGroups, sortField]);
  const templateSlice = useInfiniteSlice(
    sortedTemplates,
    LIBRARY_PAGE_SIZE,
    `${tab}-${query}-${sort}`,
  );
  const groupSlice = useInfiniteSlice(
    sortedGroups,
    LIBRARY_PAGE_SIZE,
    `${tab}-${query}-${sort}`,
  );
  const showSearch =
    (tab === "templates" && templates.length > 0) ||
    (tab === "packages" && groups.length > 0);
  const searchPlaceholder = t(
    tab === "templates"
      ? "templateLibrary.searchTemplates"
      : "templateLibrary.searchPackages",
  );

  const toggleSort = useCallback(
    (field: SortField) => {
      setSort(
        `${field}-${sortField === field && sortDir === "asc" ? "desc" : "asc"}`,
      );
    },
    [setSort, sortDir, sortField],
  );
  const toggleSelect = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const insertOne = useCallback(
    (template: Parameters<typeof templateToInsert>[0]) => {
      onInsert?.([templateToInsert(template)]);
    },
    [onInsert],
  );
  const insertGroupAll = useCallback(
    (group: ItemTemplateGroup) => onInsert?.(group.templates.map(templateToInsert)),
    [onInsert],
  );
  const insertGroupSelected = useCallback(
    (group: ItemTemplateGroup, ids: string[]) =>
      onInsert?.(
        group.templates.filter((template) => ids.includes(template.id)).map(templateToInsert),
      ),
    [onInsert],
  );
  const insertSelected = useCallback(() => {
    onInsert?.(
      templates.filter((template) => selected.has(template.id)).map(templateToInsert),
    );
  }, [onInsert, selected, templates]);
  const insertIntoDocument = useCallback(
    async (document: Document, items: TemplateInsertItem[]) => {
      try {
        await insertInto(
          document,
          items.map((item) => ({
            description: item.itemDescription,
            unitPriceCents: Math.round(item.amount * 100),
            quantity: Math.round(item.qty * 100),
          })),
        );
        toast.success(t("templateLibrary.addedTo", { number: document.number }), {
          action: {
            label: t("templateLibrary.open"),
            onClick: () =>
              navigate({
                to: "/documents/$documentId",
                params: { documentId: document.id },
              }),
          },
        });
      } catch {
        toast.error(t("templateLibrary.failedToInsertItems"));
      }
    },
    [insertInto, navigate, t],
  );
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (activePanel || tab !== "templates") return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((index) => Math.min(index + 1, sortedTemplates.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((index) => Math.max(index - 1, 0));
      } else if (insertMode && event.key === "Enter" && sortedTemplates[focusedIndex]) {
        event.preventDefault();
        if (selected.size > 0) toggleSelect(sortedTemplates[focusedIndex].id);
        else insertOne(sortedTemplates[focusedIndex]);
      }
    },
    [activePanel, focusedIndex, insertMode, selected.size, sortedTemplates, tab, toggleSelect, insertOne],
  );

  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  function switchTab(nextTab: TemplateLibraryTab) {
    onTabChange(nextTab);
    setRightPanel({ type: "none" });
    if (!onQueryChange) setInternalQuery("");
  }

  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 overflow-hidden",
        fitContent ? "max-h-[82dvh]" : "h-full",
      )}
      onKeyDown={handleKeyDown}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {!hideTabBar && (
          <TemplateLibraryTabs
            tab={tab}
            templatesCount={templates.length}
            packagesCount={groups.length}
            insertMode={insertMode}
            tabSize={tabSize}
            extraTabs={extraTabs}
            onTabChange={switchTab}
            onNewTemplate={() => setRightPanel({ type: "template-edit", template: null })}
            onExpand={onExpand}
          />
        )}
        {hideTabBar && (
          <TemplateLibraryPageActions
            tab={tab}
            showSearch={showSearch}
            query={query}
            searchPlaceholder={searchPlaceholder}
            searchRef={searchRef}
            onQueryChange={setQuery}
            onNew={() =>
              setRightPanel(
                tab === "templates"
                  ? { type: "template-edit", template: null }
                  : { type: "package-edit", group: null },
              )
            }
          />
        )}
        {!hideTabBar && showSearch && (
          <div className="shrink-0 border-b border-border-subtle px-3 py-2">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder={searchPlaceholder}
              inputRef={searchRef}
            />
          </div>
        )}
        <div
          ref={contentScrollRef}
          className={cn(
            "min-h-0 overflow-y-auto @container",
            fitContent ? "flex-auto" : "flex-1",
            !fitContent && "max-xl:pb-mobile-dock",
          )}
          style={insertMode ? { scrollbarWidth: "none" } : undefined}
        >
          {isLoading ? (
            tab === "packages" ? (
              <PackageGridSkeleton count={6} className={listSkeletonClass} />
            ) : (
              <TemplateGridSkeleton count={8} className={listSkeletonClass} />
            )
          ) : tab === "templates" ? (
            <TemplateLibraryTemplateList
              templates={templates}
              visibleTemplates={templateSlice.visible}
              currency={currency}
              query={query}
              insertMode={insertMode}
              selected={selected}
              activeTemplateId={
                rightPanel.type === "template-edit" ? rightPanel.template?.id : undefined
              }
              sortField={sortField}
              sortDir={sortDir}
              onSort={toggleSort}
              onNew={() => setRightPanel({ type: "template-edit", template: null })}
              onHover={setFocusedIndex}
              onToggleSelect={toggleSelect}
              onInsertOne={insertOne}
              onEdit={(template) => setRightPanel({ type: "template-edit", template })}
              onDelete={(id) => setConfirmDelete({ kind: "template", id })}
              drafts={drafts}
              onInsertIntoDocument={insertIntoDocument}
              hasMore={templateSlice.hasMore}
              onLoadMore={templateSlice.loadMore}
              isLoadingMore={templateSlice.isLoadingMore}
              scrollRootRef={contentScrollRef}
            />
          ) : (
            <TemplateLibraryPackageList
              groups={groups}
              visibleGroups={groupSlice.visible}
              query={query}
              insertMode={insertMode}
              activeGroupId={
                rightPanel.type === "package-detail" ? rightPanel.group.id : undefined
              }
              sortField={sortField}
              sortDir={sortDir}
              onSort={toggleSort}
              onNew={() => setRightPanel({ type: "package-edit", group: null })}
              membersForGroup={(group) =>
                group.templates.map((template) => ({
                  ...template,
                  imageUrl: templateById.get(template.id)?.imageUrl ?? null,
                }))
              }
              onOpen={(group) => setRightPanel({ type: "package-detail", group })}
              onEdit={(group) => setRightPanel({ type: "package-edit", group })}
              onDelete={(id) => setConfirmDelete({ kind: "package", id })}
              drafts={drafts}
              onInsertIntoDocument={insertIntoDocument}
              hasMore={groupSlice.hasMore}
              onLoadMore={groupSlice.loadMore}
              isLoadingMore={groupSlice.isLoadingMore}
              scrollRootRef={contentScrollRef}
            />
          )}
        </div>
        {insertMode && selected.size > 0 && tab === "templates" && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle p-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>
              {t("templateLibrary.clear")}
            </Button>
            <Button type="button" variant="solid" size="sm" onClick={insertSelected}>
              {t("templateLibrary.insertItems", {
                count: selected.size,
                plural: selected.size !== 1 ? "s" : "",
              })}
            </Button>
          </div>
        )}
        {insertMode && selected.size === 0 && tab === "templates" && templates.length > 0 && !activePanel && (
          <div className="shrink-0 border-t border-border-subtle px-4 py-2">
            <p className="text-xs text-muted-foreground">
              {t("templateLibrary.clickToInsertHint")}
            </p>
          </div>
        )}
      </div>
      {activePanel && (
        <TemplateLibraryRightPanel
          panel={activePanel}
          groups={groups}
          templates={templates}
          templateById={templateById}
          currency={currency}
          insertMode={insertMode}
          onClose={() => setRightPanel({ type: "none" })}
          onEditPackage={(group) => setRightPanel({ type: "package-edit", group })}
          onInsertGroupAll={insertGroupAll}
          onInsertGroupSelected={insertGroupSelected}
        />
      )}
      <DeleteConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title={t(
          confirmDelete?.kind === "package"
            ? "templateLibrary.deletePackageTitle"
            : "templateLibrary.deleteTemplateTitle",
        )}
        description={t(
          confirmDelete?.kind === "package"
            ? "templateLibrary.deletePackageDescription"
            : "templateLibrary.deleteTemplateDescription",
        )}
        onConfirm={() => {
          if (!confirmDelete) return;
          if (confirmDelete.kind === "package") deleteGroup(confirmDelete.id);
          else deleteTemplate(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
