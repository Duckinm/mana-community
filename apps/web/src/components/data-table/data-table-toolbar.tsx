"use client";

import type { Column, Table } from "@tanstack/react-table";
import { Check, ChevronDown, ListFilter, X } from "@/components/icons";
import * as React from "react";

import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetDragRegion } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchBar } from "@/components/ui/search-bar";
import {
  formatCalendarDate,
  toCalendarDateString,
} from "@/lib/calendar-date";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  searchColumn?: string;
  searchPlaceholder?: string;
  /** URL-backed search — bypasses table column filter state when provided. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function DataTableToolbar<TData>({
  table,
  searchColumn,
  searchPlaceholder,
  searchValue: searchValueProp,
  onSearchChange,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation("common");
  const filterableColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((col) => col.getCanFilter() && col.columnDef.meta?.variant),
    [table],
  );

  const activeFilters = table.getState().columnFilters;

  const searchValue =
    onSearchChange !== undefined
      ? (searchValueProp ?? "")
      : searchColumn
        ? ((table.getColumn(searchColumn)?.getFilterValue() as string) ?? "")
        : "";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2 py-2",
        className,
      )}
      {...props}
    >
      {searchColumn && (
        <SearchBar
          value={searchValue}
          onChange={(value) => {
            if (onSearchChange) onSearchChange(value);
            else table.getColumn(searchColumn)?.setFilterValue(value);
          }}
          placeholder={searchPlaceholder ?? t("dataTable.search")}
          className="min-w-0 flex-1 sm:max-w-xs sm:flex-none"
        />
      )}

      <div className="flex shrink-0 items-center gap-1">
        <FilterControl table={table} filterableColumns={filterableColumns} />
        <DataTableSortList table={table} align="end" />
        <DataTableViewOptions table={table} align="end" />
      </div>

      {activeFilters.length > 0 && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1">
          {activeFilters.map((filter) => {
            const col = table.getColumn(filter.id);
            const meta = col?.columnDef.meta;
            const label = meta?.label ?? filter.id;
            const value = filter.value;
            const valueLabel =
              meta?.variant === "dateRange" && Array.isArray(value)
                ? formatDateRangeChip(value as [unknown?, unknown?])
                : Array.isArray(value)
                  ? value
                      .map(
                        (v) =>
                          meta?.options?.find((o) => o.value === v)?.label ??
                          String(v),
                      )
                      .join(", ")
                  : String(value);
            return (
              <button
                key={filter.id}
                onClick={() => col?.setFilterValue(undefined)}
                className="inline-flex items-center gap-1 rounded-md border border-primary-border bg-primary-soft px-1.5 py-0.5 text-xs text-primary transition-colors hover:bg-primary-soft/80"
              >
                <span className="opacity-70">{label}:</span>
                <span className="font-medium max-w-[80px] truncate">
                  {valueLabel}
                </span>
                <X size={10} className="shrink-0 opacity-60" />
              </button>
            );
          })}
          <button
            onClick={() => table.resetColumnFilters()}
            className="text-xs text-ink-faint hover:text-foreground transition-colors"
          >
            {t("dataTable.clear")}
          </button>
        </div>
      )}
    </div>
  );
}

function formatDateRangeChip([from, to]: [unknown?, unknown?]) {
  const toLabel = (value: unknown) => {
    if (value === undefined || value === null || value === "") return "…";
    const date =
      typeof value === "number" || typeof value === "string"
        ? new Date(typeof value === "string" ? Number(value) : value)
        : value instanceof Date
          ? value
          : null;
    if (!date || Number.isNaN(date.getTime())) return "…";
    return formatCalendarDate(toCalendarDateString(date), "MMM d");
  };
  return `${toLabel(from)} – ${toLabel(to)}`;
}

interface FilterControlProps<TData> {
  table: Table<TData>;
  filterableColumns: Column<TData>[];
}

function FilterControl<TData>({
  table,
  filterableColumns,
}: FilterControlProps<TData>) {
  const { t } = useTranslation("common");
  const activeCount = table.getState().columnFilters.length;
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (filterableColumns.length === 0) return null;

  function resetExpanded(open: boolean) {
    if (!open) setExpandedId(null);
  }

  const triggerButton = (opts: {
    onClick?: () => void;
    asChild?: boolean;
  }) => (
    <button
      type="button"
      aria-label={t("dataTable.filter")}
      onClick={opts.onClick}
      className="relative flex size-9 items-center justify-center overflow-visible rounded-lg border border-border-default bg-surface-card text-ink-muted transition-colors hover:bg-surface-raised hover:text-foreground data-[state=open]:border-border-strong data-[state=open]:bg-surface-raised data-[state=open]:text-foreground"
    >
      <ListFilter size={14} />
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-white leading-none pointer-events-none">
          {activeCount}
        </span>
      )}
    </button>
  );

  const sections = (
    <FilterSections
      filterableColumns={filterableColumns}
      expandedId={expandedId}
      onExpandedChange={setExpandedId}
      density="comfortable"
    />
  );

  return (
    <>
      <div className="sm:hidden">
        {triggerButton({ onClick: () => setDrawerOpen(true) })}
        <Sheet
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open);
            resetExpanded(open);
          }}
          side="bottom"
          className="h-[min(68dvh,36rem)] pb-[env(safe-area-inset-bottom)]"
        >
          <SheetDragRegion className="flex shrink-0 items-center gap-2 px-3 pb-3">
            <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground">
              <ListFilter size={16} strokeWidth={1.75} />
            </span>
            <p className="min-w-0 flex-1 text-left text-sm font-semibold tracking-tight">
              {t("dataTable.filters")}
            </p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => table.resetColumnFilters()}
                className="shrink-0 px-2 text-xs font-medium text-muted-foreground transition-opacity hover:opacity-70"
              >
                {t("dataTable.clearAllFilters")}
              </button>
            )}
            <button
              type="button"
              aria-label={t("dataTable.filter")}
              onClick={() => {
                setDrawerOpen(false);
                resetExpanded(false);
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </SheetDragRegion>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-raised/40">
              {sections}
            </div>
          </div>
        </Sheet>
      </div>

      <div className="hidden sm:block">
        <DropdownMenu
          onOpenChange={(open) => {
            resetExpanded(open);
          }}
        >
          <DropdownMenuTrigger asChild>
            {triggerButton({})}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[min(70dvh,28rem)] w-[min(calc(100vw-2rem),16rem)] overflow-y-auto"
          >
            <DropdownMenuLabel>{t("dataTable.filters")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <FilterSections
              filterableColumns={filterableColumns}
              expandedId={expandedId}
              onExpandedChange={setExpandedId}
              density="compact"
            />
            {activeCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => table.resetColumnFilters()}
                  className="justify-center text-xs text-ink-faint"
                >
                  {t("dataTable.clearAllFilters")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

function FilterSections<TData>({
  filterableColumns,
  expandedId,
  onExpandedChange,
  density,
}: {
  filterableColumns: Column<TData>[];
  expandedId: string | null;
  onExpandedChange: (id: string | null) => void;
  density: "compact" | "comfortable";
}) {
  return (
    <>
      {filterableColumns.map((column) => (
        <FilterAccordionSection
          key={column.id}
          column={column}
          expanded={expandedId === column.id}
          onToggle={() =>
            onExpandedChange(expandedId === column.id ? null : column.id)
          }
          density={density}
        />
      ))}
    </>
  );
}

function FilterAccordionSection<TData>({
  column,
  expanded,
  onToggle,
  density,
}: {
  column: Column<TData>;
  expanded: boolean;
  onToggle: () => void;
  density: "compact" | "comfortable";
}) {
  const { t } = useTranslation("common");
  const meta = column.columnDef.meta;
  const label = meta?.label ?? column.id;
  const isActive = column.getFilterValue() !== undefined;
  const rowPad =
    density === "comfortable" ? "min-h-11 px-3 py-2.5" : "px-2 py-2";

  if (meta?.variant === "dateRange") {
    const filterValue = column.getFilterValue() as
      | [number | string | undefined, number | string | undefined]
      | undefined;
    const fromMs = filterValue?.[0];
    const toMs = filterValue?.[1];
    const fromDate =
      fromMs !== undefined && fromMs !== ""
        ? new Date(typeof fromMs === "string" ? Number(fromMs) : fromMs)
        : undefined;
    const toDate =
      toMs !== undefined && toMs !== ""
        ? new Date(typeof toMs === "string" ? Number(toMs) : toMs)
        : undefined;
    const range: DateRange = {
      from: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
      to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined,
    };
    const summary =
      range.from || range.to
        ? `${range.from ? formatCalendarDate(toCalendarDateString(range.from), "MMM d") : "…"} – ${range.to ? formatCalendarDate(toCalendarDateString(range.to), "MMM d") : "…"}`
        : undefined;

    return (
      <div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-2 text-left text-sm transition-colors hover:bg-surface-raised",
            density === "comfortable" ? "rounded-none" : "rounded-md",
            rowPad,
            isActive ? "font-medium text-foreground" : "text-foreground",
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            <span className="block truncate">{label}</span>
            {summary && density === "comfortable" && (
              <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
                {summary}
              </span>
            )}
          </span>
          <ChevronDown
            size={14}
            className={cn(
              "shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        {expanded && (
          <div className={cn("space-y-0.5", density === "comfortable" ? "border-t border-border-subtle/70 p-2" : "mb-1 px-1")}>
            <Calendar
              mode="range"
              selected={range}
              onSelect={(r) => {
                const from = r?.from;
                const to = r?.to;
                if (!from && !to) {
                  column.setFilterValue(undefined);
                  return;
                }
                column.setFilterValue([
                  from ? from.getTime() : undefined,
                  to ? to.getTime() : undefined,
                ]);
              }}
              autoFocus
            />
            {(range.from || range.to) && (
              <button
                type="button"
                onClick={() => column.setFilterValue(undefined)}
                className="w-full rounded-md px-2 py-1.5 text-center text-xs text-ink-faint transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                {t("dataTable.clear")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (meta?.variant !== "select" && meta?.variant !== "multiSelect") {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-2 text-sm",
          rowPad,
          isActive && "font-medium text-foreground",
        )}
      >
        {label}
      </div>
    );
  }

  const options = meta.options ?? [];
  const multiple = meta.variant === "multiSelect";
  const filterValue = column.getFilterValue();
  const selectedValues = new Set<string>(
    Array.isArray(filterValue) ? (filterValue as string[]) : [],
  );

  function handleSelect(value: string) {
    const current = new Set<string>(
      Array.isArray(column.getFilterValue())
        ? (column.getFilterValue() as string[])
        : [],
    );
    if (multiple) {
      if (current.has(value)) current.delete(value);
      else current.add(value);
      column.setFilterValue(current.size ? Array.from(current) : undefined);
    } else {
      const same = current.size === 1 && current.has(value);
      column.setFilterValue(same ? undefined : [value]);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 text-left text-sm transition-colors hover:bg-surface-raised",
          density === "comfortable" ? "rounded-none" : "rounded-md",
          rowPad,
          isActive ? "font-medium text-foreground" : "text-foreground",
        )}
      >
        {isActive && (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-semibold leading-none text-white">
            {selectedValues.size}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <div
          className={cn(
            "space-y-0.5",
            density === "comfortable"
              ? "border-t border-border-subtle/70 p-1.5"
              : "mb-1 px-1",
          )}
        >
          {options.map((option) => {
            const selected = selectedValues.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md text-left text-sm transition-colors hover:bg-surface-raised",
                  density === "comfortable" ? "min-h-11 px-3 py-2.5" : "px-2 py-2",
                  selected && "font-medium text-primary",
                )}
              >
                <div
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded border",
                    selected
                      ? "border-primary bg-primary"
                      : "border-border-strong opacity-60 [&_svg]:invisible",
                  )}
                >
                  <Check className="size-2.5 text-white" strokeWidth={3} />
                </div>
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
          {selectedValues.size > 0 && (
            <button
              type="button"
              onClick={() => column.setFilterValue(undefined)}
              className="w-full rounded-md px-2 py-1.5 text-center text-xs text-ink-faint transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              {t("dataTable.clear")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
