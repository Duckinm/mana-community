import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import {
  DOCUMENT_STATUS_KEYS,
  DOCUMENT_TYPE_KEYS,
} from "@/components/documents/constants";
import { DocumentTableList } from "@/components/documents/document-table-list";
import {
  DocumentViewSwitcher,
  type DocumentsView,
} from "@/components/documents/document-view-switcher";
import type { Document } from "@/components/documents/types";
import { FileSignature, Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toCalendarDateString } from "@/lib/calendar-date";
import {
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DocumentListProps {
  documents: Document[];
  sorting: SortingState;
  onSortingChange: (s: SortingState) => void;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  view: DocumentsView;
  onViewChange: (view: DocumentsView) => void;
  onNew?: () => void;
}

export function DocumentList({
  documents,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  searchQuery,
  onSearchChange,
  view,
  onViewChange,
  onNew,
}: DocumentListProps) {
  const { t } = useTranslation("documents");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    type: false,
    recurring: false,
  });

  const TYPE_OPTIONS = (["QO", "INV", "RC"] as const).map((value) => ({
    label: t(DOCUMENT_TYPE_KEYS[value]),
    value,
  }));

  const STATUS_OPTIONS = (
    ["draft", "published", "overdue", "archived"] as const
  ).map((value) => ({
    label: t(DOCUMENT_STATUS_KEYS[value]),
    value,
  }));

  const RECURRING_FILTER_OPTIONS = [
    { label: t("list.recurringOnly"), value: "true" },
  ];

  const PAID_OPTIONS = [
    { label: t("list.paid"), value: "paid" },
    { label: t("list.unpaid"), value: "unpaid" },
  ];

  const columns: ColumnDef<Document>[] = [
    {
      id: "type",
      accessorKey: "type",
      enableSorting: false,
      enableColumnFilter: true,
      enableHiding: false,
      filterFn: () => true,
      header: () => null,
      cell: () => null,
      meta: {
        label: t("list.typeFilterLabel"),
        variant: "multiSelect",
        options: TYPE_OPTIONS,
      },
    },
    {
      id: "recurring",
      accessorKey: "isRecurring",
      enableSorting: false,
      enableColumnFilter: true,
      enableHiding: false,
      filterFn: () => true,
      header: () => null,
      cell: () => null,
      meta: {
        label: t("list.recurringFilterLabel"),
        variant: "multiSelect",
        options: RECURRING_FILTER_OPTIONS,
      },
    },
    {
      id: "status",
      accessorKey: "status",
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: () => true,
      header: () => null,
      cell: () => null,
      meta: {
        label: t("list.status"),
        variant: "multiSelect",
        options: STATUS_OPTIONS,
      },
    },
    {
      id: "document",
      accessorKey: "number",
      enableSorting: true,
      enableColumnFilter: false,
      header: () => null,
      cell: () => null,
      meta: { label: t("list.document") },
    },
    {
      id: "clientName",
      accessorKey: "clientName",
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: () => true,
      header: () => null,
      cell: () => null,
      meta: { label: t("list.client") },
    },
    {
      id: "project",
      accessorKey: "projectName",
      enableSorting: true,
      enableColumnFilter: false,
      header: () => null,
      cell: () => null,
      meta: { label: t("list.project") },
    },
    {
      id: "total",
      accessorKey: "totalCents",
      enableSorting: true,
      enableColumnFilter: false,
      header: () => null,
      cell: () => null,
      meta: { label: t("list.total") },
    },
    {
      id: "issueDate",
      accessorKey: "issueDate",
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: () => true,
      header: () => null,
      cell: () => null,
      meta: {
        label: t("list.issueDate"),
        variant: "dateRange",
      },
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      enableSorting: true,
      enableColumnFilter: false,
      header: () => null,
      cell: () => null,
      meta: { label: t("list.dueDate") },
    },
    {
      id: "paid",
      accessorKey: "paidAt",
      enableSorting: false,
      enableColumnFilter: true,
      enableHiding: false,
      filterFn: () => true,
      header: () => null,
      cell: () => null,
      meta: {
        label: t("list.paidFilterLabel"),
        variant: "multiSelect",
        options: PAID_OPTIONS,
      },
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      enableSorting: true,
      enableColumnFilter: false,
      header: () => null,
      cell: () => null,
      meta: { label: t("list.updatedAt") },
    },
  ];

  const table = useReactTable({
    data: documents,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, sorting);
      onSortingChange(next);
    },
    onColumnFiltersChange: (updater) => {
      const next = functionalUpdate(updater, columnFilters);
      onColumnFiltersChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualSorting: true,
  });

  const hasActiveFilters = columnFilters.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-start gap-2">
        <DataTableToolbar
          table={table}
          searchColumn="clientName"
          searchPlaceholder={t("list.searchPlaceholder")}
          searchValue={searchQuery}
          onSearchChange={onSearchChange}
          className="min-w-0 flex-1"
        />
        <div className="py-2">
          <DocumentViewSwitcher current={view} onViewChange={onViewChange} />
        </div>
      </div>
      {documents.length === 0 ? (
        hasActiveFilters ? (
          <div className="list-shell flex flex-col items-center gap-4 px-4 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-surface-raised">
              <FileSignature
                size={20}
                className="text-ink-muted"
                strokeWidth={1.5}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {t("list.noDocumentsFound")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("list.tryAdjustingFilters")}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl text-xs font-semibold"
              onClick={() => onColumnFiltersChange([])}
            >
              <X size={12} />
              {t("list.clearFilters")}
            </Button>
          </div>
        ) : (
          <div className="list-shell">
            <EmptyState
              icon={FileSignature}
              title={t("list.noDocumentsYet")}
              description={t("list.createToStart")}
              action={onNew && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onNew}
              >
                <Plus size={12} />
                {t("list.newDocument")}
              </Button>
              )}
            />
          </div>
        )
      ) : (
        <DocumentTableList
          documents={documents}
          sorting={sorting}
          emptyMessage={t("list.emptyMessage")}
          view={view}
          columnVisibility={columnVisibility}
        />
      )}
    </div>
  );
}

export function timestampFilterToCalendarDate(
  ms: number | string | undefined,
): string | undefined {
  if (!ms) return undefined;
  const date = new Date(typeof ms === "string" ? Number(ms) : ms);
  if (Number.isNaN(date.getTime())) return undefined;
  return toCalendarDateString(date);
}
