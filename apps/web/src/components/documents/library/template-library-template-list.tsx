import { EmptyTemplates } from "@/components/documents/library/template-library-tab-button";
import { TemplateLibraryContextMenu } from "@/components/documents/library/template-library-context-menu";
import {
  libraryTableHeader,
  SortHeaderCell,
} from "@/components/documents/library/template-library-sort-header";
import {
  templateToInsert,
  type SortDir,
  type SortField,
  type TemplateInsertItem,
} from "@/components/documents/library/template-library-types";
import { TemplateRow } from "@/components/documents/library/template-row";
import { TemplateRowSkeleton } from "@/components/documents/library/template-row-skeleton";
import type { Document } from "@/components/documents/types";
import { Pencil, Trash2 } from "@/components/icons";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import type { ItemTemplate } from "@/hooks/use-item-templates";
import { cn } from "@/lib/utils";
import type { ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";

const listShellClass =
  "list-shell my-5 max-xl:mx-0 xl:mx-4 @xl:mx-6 @4xl:mx-10";

export function TemplateLibraryTemplateList({
  templates,
  visibleTemplates,
  currency,
  query,
  insertMode,
  selected,
  activeTemplateId,
  sortField,
  sortDir,
  onSort,
  onNew,
  onHover,
  onToggleSelect,
  onInsertOne,
  onEdit,
  onDelete,
  drafts,
  onInsertIntoDocument,
  hasMore,
  onLoadMore,
  isLoadingMore,
  scrollRootRef,
}: {
  templates: ItemTemplate[];
  visibleTemplates: ItemTemplate[];
  currency: string;
  query: string;
  insertMode: boolean;
  selected: Set<string>;
  activeTemplateId?: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onNew: () => void;
  onHover: (index: number) => void;
  onToggleSelect: (id: string) => void;
  onInsertOne: (template: ItemTemplate) => void;
  onEdit: (template: ItemTemplate) => void;
  onDelete: (id: string) => void;
  drafts: Document[];
  onInsertIntoDocument: (
    document: Document,
    items: TemplateInsertItem[],
  ) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  scrollRootRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation("documents");

  if (templates.length === 0) {
    return <EmptyTemplates onNew={onNew} />;
  }

  if (visibleTemplates.length === 0) {
    return <NoResults query={query} />;
  }

  return (
    <>
      <div
        className={cn(
          "overflow-hidden",
          !insertMode && listShellClass,
          insertMode && "bg-surface-card",
        )}
      >
        <div className={libraryTableHeader}>
          {insertMode && <span className="h-4 w-4 shrink-0" />}
          <SortHeaderCell
            label={t("templateLibrary.colName")}
            field="name"
            active={sortField === "name"}
            dir={sortDir}
            onClick={onSort}
            className="min-w-0 flex-1"
          />
          {insertMode ? (
            <div className="flex shrink-0 items-center gap-3">
              <span className="w-12 text-center text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("templateLibrary.colQty")}
              </span>
              <SortHeaderCell
                label={t("templateLibrary.colPrice")}
                field="price"
                active={sortField === "price"}
                dir={sortDir}
                onClick={onSort}
                className="w-20 justify-start"
                reverse
              />
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-3">
              <SortHeaderCell
                label={t("templateLibrary.colQty")}
                field="qty"
                active={sortField === "qty"}
                dir={sortDir}
                onClick={onSort}
                className="w-12 justify-center"
              />
              <SortHeaderCell
                label={t("templateLibrary.colPrice")}
                field="price"
                active={sortField === "price"}
                dir={sortDir}
                onClick={onSort}
                className="min-w-20 justify-start"
                reverse
              />
              <span className="hidden h-8 w-8 shrink-0 xl:block" />
            </div>
          )}
        </div>
        {visibleTemplates.map((template, index) => (
          <TemplateListRow
            key={template.id}
            template={template}
            currency={currency}
            insertMode={insertMode}
            selected={selected}
            activeTemplateId={activeTemplateId}
            onHover={() => onHover(index)}
            onToggleSelect={onToggleSelect}
            onInsertOne={onInsertOne}
            onEdit={onEdit}
            onDelete={onDelete}
            drafts={drafts}
            onInsertIntoDocument={onInsertIntoDocument}
            bordered={index > 0}
          />
        ))}
        {isLoadingMore &&
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`template-more-${index}`}
              className="border-t border-border-subtle"
            >
              <TemplateRowSkeleton />
            </div>
          ))}
      </div>
      <InfiniteScrollSentinel
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        scrollRootRef={scrollRootRef}
        isLoadingMore={isLoadingMore}
        className="h-8"
      />
    </>
  );
}

function TemplateListRow({
  template,
  currency,
  insertMode,
  selected,
  activeTemplateId,
  onHover,
  onToggleSelect,
  onInsertOne,
  onEdit,
  onDelete,
  drafts,
  onInsertIntoDocument,
  bordered,
}: {
  template: ItemTemplate;
  currency: string;
  insertMode: boolean;
  selected: Set<string>;
  activeTemplateId?: string;
  onHover: () => void;
  onToggleSelect: (id: string) => void;
  onInsertOne: (template: ItemTemplate) => void;
  onEdit: (template: ItemTemplate) => void;
  onDelete: (id: string) => void;
  drafts: Document[];
  onInsertIntoDocument: (
    document: Document,
    items: TemplateInsertItem[],
  ) => void;
  bordered: boolean;
}) {
  const { t } = useTranslation("documents");
  const isSelected = selected.has(template.id);
  const row = (
    <TemplateRow
      template={template}
      currency={currency}
      insertMode={insertMode}
      isSelected={isSelected}
      isEditing={activeTemplateId === template.id}
      showCheckbox={selected.size > 0}
      onMouseEnter={onHover}
      onClick={
        insertMode
          ? () => {
              if (selected.size > 0) onToggleSelect(template.id);
              else onInsertOne(template);
            }
          : undefined
      }
      onToggleSelect={() => onToggleSelect(template.id)}
      onEdit={insertMode ? undefined : () => onEdit(template)}
      onDelete={insertMode ? undefined : () => onDelete(template.id)}
    />
  );

  return (
    <div className={bordered ? "border-t border-border-subtle" : undefined}>
      {insertMode ? (
        row
      ) : (
        <TemplateLibraryContextMenu
          drafts={drafts}
          onSelect={(document) =>
            onInsertIntoDocument(document, [templateToInsert(template)])
          }
          actions={
            <>
              <ContextAction
                onClick={() => onEdit(template)}
                icon={<Pencil size={14} strokeWidth={1.75} />}
              >
                {t("templateLibrary.edit")}
              </ContextAction>
              <ContextAction
                onClick={() => onDelete(template.id)}
                icon={<Trash2 size={14} strokeWidth={1.75} />}
                destructive
              >
                {t("templateLibrary.delete")}
              </ContextAction>
            </>
          }
        >
          {row}
        </TemplateLibraryContextMenu>
      )}
    </div>
  );
}

function ContextAction({
  children,
  icon,
  onClick,
  destructive = false,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <ContextMenuItem
      onClick={onClick}
      className={destructive ? "text-danger focus:text-danger" : undefined}
    >
      {icon}
      {children}
    </ContextMenuItem>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-xs text-muted-foreground">No results for "{query}"</p>
    </div>
  );
}
