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
import {
  PackageCard,
  type PackageCardMember,
} from "@/components/documents/library/package-card";
import { PackageCardSkeleton } from "@/components/documents/library/package-card-skeleton";
import type { Document } from "@/components/documents/types";
import { Eye, Pencil, Trash2 } from "@/components/icons";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { EmptyPackages } from "@/components/documents/library/package-card";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import type { ItemTemplateGroup } from "@/hooks/use-item-template-groups";
import { cn } from "@/lib/utils";
import type { ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";

const listShellClass =
  "list-shell my-5 max-xl:mx-0 xl:mx-4 @xl:mx-6 @4xl:mx-10";

export function TemplateLibraryPackageList({
  groups,
  visibleGroups,
  query,
  insertMode,
  activeGroupId,
  sortField,
  sortDir,
  onSort,
  onNew,
  membersForGroup,
  onOpen,
  onEdit,
  onDelete,
  drafts,
  onInsertIntoDocument,
  hasMore,
  onLoadMore,
  isLoadingMore,
  scrollRootRef,
}: {
  groups: ItemTemplateGroup[];
  visibleGroups: ItemTemplateGroup[];
  query: string;
  insertMode: boolean;
  activeGroupId?: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onNew: () => void;
  membersForGroup: (group: ItemTemplateGroup) => PackageCardMember[];
  onOpen: (group: ItemTemplateGroup) => void;
  onEdit: (group: ItemTemplateGroup) => void;
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

  if (groups.length === 0) {
    return <EmptyPackages onNew={onNew} />;
  }

  if (visibleGroups.length === 0) {
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
          <SortHeaderCell
            label={t("templateLibrary.colName")}
            field="name"
            active={sortField === "name"}
            dir={sortDir}
            onClick={onSort}
            className="min-w-0 flex-1"
          />
          <SortHeaderCell
            label={t("templateLibrary.colItems")}
            field="items"
            active={sortField === "items"}
            dir={sortDir}
            onClick={onSort}
          />
          <SortHeaderCell
            label={t("templateLibrary.colUpdated")}
            field="updated"
            active={sortField === "updated"}
            dir={sortDir}
            onClick={onSort}
            className="hidden sm:inline-flex"
          />
          <span className="w-8 shrink-0" aria-hidden />
        </div>
        {visibleGroups.map((group, index) => (
          <PackageListRow
            key={group.id}
            group={group}
            insertMode={insertMode}
            active={activeGroupId === group.id}
            members={membersForGroup(group)}
            onOpen={() => onOpen(group)}
            onEdit={() => onEdit(group)}
            onDelete={() => onDelete(group.id)}
            drafts={drafts}
            onInsertIntoDocument={onInsertIntoDocument}
            bordered={index > 0}
          />
        ))}
        {isLoadingMore &&
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`package-more-${index}`}
              className="border-t border-border-subtle"
            >
              <PackageCardSkeleton />
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

function PackageListRow({
  group,
  insertMode,
  active,
  members,
  onOpen,
  onEdit,
  onDelete,
  drafts,
  onInsertIntoDocument,
  bordered,
}: {
  group: ItemTemplateGroup;
  insertMode: boolean;
  active: boolean;
  members: PackageCardMember[];
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  drafts: Document[];
  onInsertIntoDocument: (
    document: Document,
    items: TemplateInsertItem[],
  ) => void;
  bordered: boolean;
}) {
  const { t } = useTranslation("documents");
  const row = (
    <PackageCard
      group={group}
      members={members}
      active={active}
      onOpen={onOpen}
      onEdit={insertMode ? undefined : onEdit}
      onDelete={insertMode ? undefined : onDelete}
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
            onInsertIntoDocument(document, group.templates.map(templateToInsert))
          }
          actions={
            <>
              <ContextAction icon={<Eye size={14} strokeWidth={1.75} />} onClick={onOpen}>
                {t("templateLibrary.view")}
              </ContextAction>
              <ContextAction icon={<Pencil size={14} strokeWidth={1.75} />} onClick={onEdit}>
                {t("templateLibrary.edit")}
              </ContextAction>
              <ContextAction
                icon={<Trash2 size={14} strokeWidth={1.75} />}
                onClick={onDelete}
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
