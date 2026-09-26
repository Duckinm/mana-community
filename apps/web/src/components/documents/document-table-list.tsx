import {
  DocumentClientCell,
  DocumentPrimaryCell,
} from "@/components/documents/document-list-cells";
import { DocumentStatusIcon } from "@/components/documents/document-status-icon";
import {
  DocumentActionSeparator,
  DocumentActionsMenu,
  DocumentContextMenu,
} from "@/components/documents/document-actions-menu";
import {
  groupDocumentsByType,
  sortDocumentsForFlatView,
} from "@/components/documents/document-table-sort";
import { DocumentTypeHeader } from "@/components/documents/document-type-header";
import type { DocumentsView } from "@/components/documents/document-view-switcher";
import type { Document, DocumentType } from "@/components/documents/types";
import { formatCurrency } from "@/components/documents/utils";
import { ProjectBadge } from "@/components/projects/project-badge";
import { cn } from "@/lib/utils";
import type { SortingState } from "@tanstack/react-table";
import { useNavigate } from "@tanstack/react-router";
import { type CSSProperties, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCalendarDate } from "@/lib/calendar-date";
import { formatTimestamp } from "@/lib/timestamp";

// Money/date tracks are `auto` so the widest formatted value in the whole list
// sets the column, and every row inherits it via subgrid instead of measuring alone.
const DOCUMENT_COLUMNS = [
  { id: "status", track: "4.25rem", from: "base" },
  { id: "document", track: "auto", from: "base" },
  { id: "clientName", track: "minmax(0,1fr)", from: "base" },
  { id: "project", track: "minmax(5rem,10rem)", from: "lg" },
  { id: "total", track: "auto", from: "sm" },
  { id: "issueDate", track: "auto", from: "base" },
  { id: "dueDate", track: "auto", from: "lg" },
  { id: "updatedAt", track: "auto", from: "lg" },
  { id: "actions", track: "2rem", from: "lg" },
] as const;

type DocumentColumnId = (typeof DOCUMENT_COLUMNS)[number]["id"];

const BREAKPOINT_ORDER = { base: 0, sm: 1, lg: 2 } as const;

const DOCUMENT_LIST_GRID =
  "hidden gap-x-3 sm:grid sm:grid-cols-[var(--doc-cols-sm)] lg:grid-cols-[var(--doc-cols-lg)]";

const DOCUMENT_ROW_GRID = "col-span-full grid grid-cols-subgrid";

export function gridTemplates(hidden: (id: DocumentColumnId) => boolean) {
  const template = (bp: keyof typeof BREAKPOINT_ORDER) =>
    DOCUMENT_COLUMNS.filter(
      (column) =>
        BREAKPOINT_ORDER[column.from] <= BREAKPOINT_ORDER[bp] &&
        !hidden(column.id),
    )
      .map((column) => column.track)
      .join(" ");

  return {
    "--doc-cols-base": template("base"),
    "--doc-cols-sm": template("sm"),
    "--doc-cols-lg": template("lg"),
  } as CSSProperties;
}

function DocumentTableRow({
  doc,
  hidden,
}: {
  doc: Document;
  hidden: (id: DocumentColumnId) => boolean;
}) {
  const navigate = useNavigate();

  return (
    <DocumentContextMenu doc={doc}>
      <div
        data-testid="document-row"
        data-issue-date={doc.issueDate ?? ""}
        onClick={() =>
          navigate({
            to: "/documents/$documentId",
            params: { documentId: doc.id },
          })
        }
        className={cn(
          DOCUMENT_ROW_GRID,
          "group cursor-pointer items-center border-b border-border-subtle py-2 transition-colors duration-fast last:border-b-0 hover:bg-surface-raised",
        )}
      >
        {!hidden("status") && (
          <div className="flex items-center justify-center">
            <DocumentStatusIcon
              status={doc.status}
              type={doc.type}
              dueDate={doc.dueDate}
            />
          </div>
        )}

        {!hidden("document") && (
          <div className="min-w-0">
            <DocumentPrimaryCell doc={doc} />
          </div>
        )}

        {!hidden("clientName") && (
          <div className="min-w-0">
            <DocumentClientCell doc={doc} />
          </div>
        )}

        {!hidden("project") && (
          <div className="hidden min-w-0 lg:block">
            {doc.projectName && doc.projectColor && (
              <ProjectBadge
                name={doc.projectName}
                icon={doc.projectIcon}
                color={doc.projectColor}
              />
            )}
          </div>
        )}

        {!hidden("total") && (
          <span className="hidden whitespace-nowrap text-right text-money text-xs font-medium text-muted-foreground sm:block">
            {formatCurrency(doc.totalCents, doc.currency)}
          </span>
        )}

        {!hidden("issueDate") && (
          <span className="whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
            {doc.issueDate ? formatCalendarDate(doc.issueDate) : "—"}
          </span>
        )}

        {!hidden("dueDate") && (
          <span className="hidden whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground lg:block">
            {doc.dueDate ? formatCalendarDate(doc.dueDate) : "—"}
          </span>
        )}

        {!hidden("updatedAt") && (
          <span className="hidden whitespace-nowrap text-right text-[11px] tabular-nums text-ink-faint lg:block">
            {formatTimestamp(doc.updatedAt)}
          </span>
        )}

        <div className="hidden items-center justify-center opacity-0 transition-opacity duration-fast lg:flex lg:focus-within:opacity-100 lg:group-hover:opacity-100">
          <DocumentActionsMenu doc={doc}>
            {(items) => (
              <>
                {items.view}
                {items.edit}
                {items.publish}
                {items.sendToClient}
                {items.sendEtax}
                {items.publicLinkStatus}
                {items.copyPublicLink}
                {items.openPublicView}
                {items.rotatePublicLink}
                {items.revokePublicLink}
                {items.promote}
                <DocumentActionSeparator root="dropdown" />
                {items.archive}
                {items.deleteDraft}
              </>
            )}
          </DocumentActionsMenu>
        </div>
      </div>
    </DocumentContextMenu>
  );
}

function DocumentCardRow({ doc }: { doc: Document }) {
  const navigate = useNavigate();

  return (
    <DocumentContextMenu doc={doc}>
      <div
        data-testid="document-card"
        onClick={() =>
          navigate({
            to: "/documents/$documentId",
            params: { documentId: doc.id },
          })
        }
        className="flex cursor-pointer items-center gap-3 border-b border-border-subtle px-3 py-3 last:border-b-0 active:bg-surface-raised"
      >
        <DocumentStatusIcon
          status={doc.status}
          type={doc.type}
          dueDate={doc.dueDate}
        />
        <div className="min-w-0 flex-1">
          <DocumentPrimaryCell doc={doc} />
          <DocumentClientCell doc={doc} />
        </div>
        <span className="shrink-0 whitespace-nowrap text-right text-money text-sm font-medium text-foreground">
          {formatCurrency(doc.totalCents, doc.currency)}
        </span>
      </div>
    </DocumentContextMenu>
  );
}

export function DocumentTableList({
  documents,
  emptyMessage,
  sorting = [],
  projectId,
  view,
  columnVisibility,
}: {
  documents: Document[];
  emptyMessage: string;
  sorting?: SortingState;
  projectId?: string;
  view: DocumentsView;
  columnVisibility?: Record<string, boolean>;
}) {
  const { t } = useTranslation("documents");
  const hidden = (id: DocumentColumnId) => columnVisibility?.[id] === false;
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Set<DocumentType>>(
    () => new Set(),
  );

  const groups = useMemo(
    () => groupDocumentsByType(documents, sorting),
    [documents, sorting],
  );
  const flatDocuments = useMemo(
    () => sortDocumentsForFlatView(documents, sorting),
    [documents, sorting],
  );

  function toggleGroup(type: DocumentType) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="list-shell px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="list-shell">
      <div className="sm:hidden">
        {view === "chronological" ? (
          flatDocuments.map((doc) => (
            <DocumentCardRow key={doc.id} doc={doc} />
          ))
        ) : (
          groups.map(({ type, documents: groupDocs }, groupIndex) => {
            const isCollapsed = collapsed.has(type);

            return (
              <div
                key={type}
                className={cn(groupIndex > 0 && "border-t border-border-subtle")}
              >
                <DocumentTypeHeader
                  type={type}
                  count={groupDocs.length}
                  collapsed={isCollapsed}
                  onToggle={() => toggleGroup(type)}
                  onAdd={() =>
                    navigate({
                      to: "/documents/new",
                      search: { type, projectId },
                    })
                  }
                  className="bg-surface-raised/40 px-3 py-2"
                />
                {!isCollapsed &&
                  groupDocs.map((doc) => (
                    <DocumentCardRow key={doc.id} doc={doc} />
                  ))}
              </div>
            );
          })
        )}
      </div>

      <div className={DOCUMENT_LIST_GRID} style={gridTemplates(hidden)}>
        {view === "chronological" ? (
          <>
            <div
              data-testid="document-list-header"
              className={cn(
                DOCUMENT_ROW_GRID,
                "items-center border-b border-border-subtle py-2.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground",
              )}
            >
              {!hidden("status") && (
                <span className="text-center">{t("list.status")}</span>
              )}
              {!hidden("document") && <span>{t("list.document")}</span>}
              {!hidden("clientName") && <span>{t("list.client")}</span>}
              {!hidden("project") && (
                <span className="hidden lg:block">{t("list.project")}</span>
              )}
              {!hidden("total") && (
                <span className="hidden text-right sm:block">
                  {t("list.total")}
                </span>
              )}
              {!hidden("issueDate") && (
                <span className="text-right">{t("list.issueDate")}</span>
              )}
              {!hidden("dueDate") && (
                <span className="hidden text-right lg:block">
                  {t("list.dueDate")}
                </span>
              )}
              {!hidden("updatedAt") && (
                <span className="hidden text-right lg:block">
                  {t("list.updatedAt")}
                </span>
              )}
              <span className="hidden lg:block" aria-hidden="true" />
            </div>
            {flatDocuments.map((doc) => (
              <DocumentTableRow key={doc.id} doc={doc} hidden={hidden} />
            ))}
          </>
        ) : (
          groups.map(({ type, documents: groupDocs }, groupIndex) => {
            const isCollapsed = collapsed.has(type);

            return (
              <div
                key={type}
                data-testid="document-type-group"
                className={cn(
                  DOCUMENT_ROW_GRID,
                  groupIndex > 0 && "border-t border-border-subtle",
                )}
              >
                <DocumentTypeHeader
                  type={type}
                  count={groupDocs.length}
                  collapsed={isCollapsed}
                  onToggle={() => toggleGroup(type)}
                  onAdd={() =>
                    navigate({
                      to: "/documents/new",
                      search: { type, projectId },
                    })
                  }
                  className="col-span-full bg-surface-raised/40 px-3 py-2"
                />
                {!isCollapsed &&
                  groupDocs.map((doc) => (
                    <DocumentTableRow key={doc.id} doc={doc} hidden={hidden} />
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
