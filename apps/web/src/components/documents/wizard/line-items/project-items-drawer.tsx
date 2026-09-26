import { useState } from "react";
import { X, ChevronDown, ChevronRight, Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetDragRegion } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentNumber } from "@/components/documents/document-number";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { formatCalendarDate } from "@/lib/calendar-date";
import { fromQuantity } from "@/lib/quantity";
import { useProjectDocuments } from "@/hooks/use-project-documents";
import type { Document, DocumentItem } from "@/components/documents/types";
import { CURRENCIES } from "@/components/documents/ui/currency-combobox";

interface ProjectItemsDrawerProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onInsert: (
    items: { itemDescription: string; qty: number; amount: number }[],
  ) => void;
  currency: string;
}

function formatCents(cents: number, currency: string): string {
  const curr = CURRENCIES.find((c) => c.value === currency);
  const symbol = curr?.symbol ?? "$";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

type SelectionKey = `${string}:${number}`;

function DocRow({
  doc,
  selected,
  currency,
  onToggleItem,
}: {
  doc: Document;
  selected: Set<SelectionKey>;
  currency: string;
  onToggleItem: (key: SelectionKey) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const items: DocumentItem[] = doc.items ?? [];
  const itemCount = items.length;

  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-surface-raised transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown
            size={12}
            className="flex-shrink-0 text-muted-foreground"
          />
        ) : (
          <ChevronRight
            size={12}
            className="flex-shrink-0 text-muted-foreground"
          />
        )}
        <DocumentNumber
          number={doc.number}
          type={doc.type}
          className="text-xs font-medium font-mono text-foreground truncate flex-1"
        />
        <DocumentStatusBadge
          status={doc.status}
          type={doc.type}
          dueDate={doc.dueDate}
        />
        {doc.issueDate && (
          <span className="text-2xs text-muted-foreground flex-shrink-0">
            {formatCalendarDate(doc.issueDate)}
          </span>
        )}
        {itemCount > 0 && (
          <span className="text-2xs text-muted-foreground flex-shrink-0">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {expanded && (
        <div className="pb-1">
          {items.length === 0 ? (
            <p className="px-8 py-2 text-2xs text-muted-foreground">
              No line items
            </p>
          ) : (
            items.map((item, idx) => {
              const key: SelectionKey = `${doc.id}:${idx}`;
              const isSelected = selected.has(key);
              return (
                <div
                  key={key}
                  className="flex items-start gap-2 px-8 py-1.5 cursor-pointer hover:bg-surface-raised transition-colors"
                  onClick={() => onToggleItem(key)}
                >
                  <div
                    className={`mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded border transition-colors ${
                      isSelected
                        ? "bg-warning border-warning"
                        : "border-border-strong bg-transparent"
                    }`}
                  >
                    {isSelected && (
                      <Check size={10} className="text-white m-auto mt-[1px]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      {item.description}
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      {formatCents(item.unitPriceCents, currency)} ×{" "}
                      {fromQuantity(item.quantity).toFixed(
                        item.quantity % 100 === 0 ? 0 : 2,
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ProjectItemsDrawer({
  projectId,
  open,
  onClose,
  onInsert,
  currency,
}: ProjectItemsDrawerProps) {
  const { data: docs = [], isLoading } = useProjectDocuments(projectId);
  const [selected, setSelected] = useState<Set<SelectionKey>>(new Set());

  function toggleItem(key: SelectionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleInsert() {
    const items: { itemDescription: string; qty: number; amount: number }[] =
      [];
    for (const key of selected) {
      const [docId, idxStr] = key.split(":");
      const idx = parseInt(idxStr, 10);
      const doc = docs.find((d) => d.id === docId);
      const item = doc?.items?.[idx];
      if (item) {
        items.push({
          itemDescription: item.description,
          qty: fromQuantity(item.quantity),
          amount: item.unitPriceCents / 100,
        });
      }
    }
    onInsert(items);
    setSelected(new Set());
    onClose();
  }

  const selectedCount = selected.size;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      side="right"
      className="w-full max-w-[400px] border-border-subtle bg-surface-overlay"
    >
      <SheetDragRegion className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
        <span className="text-sm font-semibold text-foreground">
          Import from Project
        </span>
        <Button type="button" variant="ghost" size="icon-xs" onClick={onClose}>
          <X size={14} />
        </Button>
      </SheetDragRegion>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <DrawerSkeleton />
        ) : docs.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-muted-foreground">
              No other documents in this project
            </p>
          </div>
        ) : (
          docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              selected={selected}
              currency={currency}
              onToggleItem={toggleItem}
            />
          ))
        )}
      </div>

      {selectedCount > 0 && (
        <div className="shrink-0 border-t border-border-subtle p-3">
          <Button
            type="button"
            variant="solid"
            className="w-full"
            onClick={handleInsert}
          >
            Import selected ({selectedCount})
          </Button>
        </div>
      )}
    </Sheet>
  );
}
