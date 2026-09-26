"use client";

import type { Table } from "@tanstack/react-table";
import { Check, Settings2 } from "@/components/icons";
import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DataTableViewOptionsProps<TData> extends React.ComponentProps<
  typeof PopoverContent
> {
  table: Table<TData>;
  disabled?: boolean;
}

export function DataTableViewOptions<TData>({
  table,
  disabled,
  ...props
}: DataTableViewOptionsProps<TData>) {
  const { t } = useTranslation("common");
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide(),
        ),
    [table],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={t("dataTable.toggleColumns")}
          disabled={disabled}
          className="flex size-9 items-center justify-center rounded-lg border border-border-default bg-surface-card text-ink-muted transition-colors hover:bg-surface-raised hover:text-foreground data-[state=open]:border-border-strong data-[state=open]:bg-surface-raised data-[state=open]:text-foreground"
        >
          <Settings2 size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" {...props}>
        <Command>
          <CommandInput placeholder={t("dataTable.searchColumns")} />
          <CommandList>
            <CommandEmpty>{t("dataTable.noColumnsFound")}</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                >
                  <span className="truncate">
                    {column.columnDef.meta?.label ?? column.id}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      column.getIsVisible() ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
