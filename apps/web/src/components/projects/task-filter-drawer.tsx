import { PRIORITY_COLOR } from "@/components/projects/constants";
import {
  EMPTY_FILTER,
  isFilterActive,
  type TaskFilter,
} from "@/components/projects/task-filter-matching";
import { useTaskFilterOptions } from "@/components/projects/use-task-filter-options";
import {
  Calendar,
  Check,
  ChevronDown,
  CircleDot,
  Clock,
  Flag,
  ListFilter,
  Tag,
  X,
} from "@/components/icons";
import { Sheet, SheetDragRegion } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";

type FilterSection = "status" | "priority" | "tags" | "due" | "created";

function MultiSelectList<T extends string>({
  options,
  selected,
  onToggle,
  renderDot,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
  renderDot?: (v: T) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 p-1.5">
      {options.map(({ value, label }) => {
        const checked = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className="flex min-h-9 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-raised"
          >
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-md transition-all"
              style={{
                background: checked ? "var(--primary)" : "transparent",
                border: `1.5px solid ${checked ? "var(--primary)" : "var(--text-muted)"}`,
              }}
            >
              {checked && (
                <Check
                  size={12}
                  strokeWidth={3}
                  color="var(--text-on-accent)"
                />
              )}
            </span>
            {renderDot?.(value)}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function RadioList<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1 p-1.5">
      {options.map(({ value, label }) => {
        const active = selected === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(active ? null : value)}
            className={cn(
              "flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-raised",
              active
                ? "bg-primary-soft font-medium text-primary"
                : "text-foreground",
            )}
          >
            {label}
            {active && (
              <Check size={14} strokeWidth={2.5} className="shrink-0 text-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function AccordionSection({
  icon: Icon,
  label,
  summary,
  active,
  open,
  onToggle,
  children,
}: {
  icon: typeof ListFilter;
  label: string;
  summary?: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-surface-raised"
      >
        <Icon
          size={16}
          strokeWidth={1.75}
          className={cn(
            "shrink-0",
            active ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
          {label}
          {summary && (
            <span className="font-normal text-muted-foreground">
              {": "}
              {summary}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.77,0,0.175,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border-subtle bg-card/40 px-1 py-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileTaskFilterButton({
  filter,
  onChange,
}: {
  filter: TaskFilter;
  onChange: (f: TaskFilter) => void;
}) {
  const { t, allLabels, statusConfig, priorityOptions, dueRangeOptions, createdRangeOptions, toggle } = useTaskFilterOptions(filter, onChange);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<FilterSection | null>(null);


  const active = isFilterActive(filter);


  function closeDrawer(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setExpanded(null);
  }

  function toggleSection(section: FilterSection) {
    setExpanded((current) => (current === section ? null : section));
  }

  const statusSummary =
    filter.statuses.length > 0
      ? filter.statuses
          .map((s) => statusConfig.find((x) => x.value === s)?.label ?? s)
          .join(", ")
      : undefined;
  const prioritySummary =
    filter.priorities.length > 0
      ? filter.priorities
          .map((p) => priorityOptions.find((x) => x.value === p)?.label ?? p)
          .join(", ")
      : undefined;
  const tagsSummary =
    filter.tags.length > 0
      ? filter.tags
          .map((id) => allLabels.find((l) => l.id === id)?.name ?? id)
          .join(", ")
      : undefined;
  const dueSummary = filter.due
    ? dueRangeOptions.find((r) => r.value === filter.due)?.label
    : undefined;
  const createdSummary = filter.created
    ? createdRangeOptions.find((r) => r.value === filter.created)?.label
    : undefined;

  const activeChips = [
    statusSummary && {
      key: "status" as const,
      icon: CircleDot,
      label: t("filterBar.status"),
      summary: statusSummary,
    },
    prioritySummary && {
      key: "priority" as const,
      icon: Flag,
      label: t("filterBar.priority"),
      summary: prioritySummary,
    },
    tagsSummary && {
      key: "tags" as const,
      icon: Tag,
      label: t("filterBar.tags"),
      summary: tagsSummary,
    },
    dueSummary && {
      key: "due" as const,
      icon: Calendar,
      label: t("filterBar.due"),
      summary: dueSummary,
    },
    createdSummary && {
      key: "created" as const,
      icon: Clock,
      label: t("filterBar.created"),
      summary: createdSummary,
    },
  ].filter(Boolean) as {
    key: FilterSection;
    icon: typeof ListFilter;
    label: string;
    summary: string;
  }[];

  return (
    <>
      <div className="flex max-w-full flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("filterBar.filters")}
          aria-expanded={open}
          className="flex max-w-full flex-wrap items-center gap-1.5"
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
              active
                ? "border-primary-border bg-primary-soft text-primary"
                : "border-border-default text-muted-foreground hover:bg-surface-raised hover:text-foreground",
            )}
          >
            <ListFilter size={16} strokeWidth={active ? 2.25 : 1.75} />
          </span>
          {activeChips.map(({ key, icon: Icon, label, summary }) => (
            <span
              key={key}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary-border bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary"
            >
              <Icon size={13} strokeWidth={2} className="shrink-0" />
              <span className="max-w-40 truncate">
                <span className="opacity-80">{label}:</span> {summary}
              </span>
            </span>
          ))}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTER)}
            className="shrink-0 px-1.5 text-xs font-medium text-muted-foreground transition-opacity hover:opacity-70"
          >
            {t("filterBar.clearAll")}
          </button>
        )}
      </div>

      <Sheet
        open={open}
        onOpenChange={closeDrawer}
        side="bottom"
        className="h-[min(68dvh,36rem)] pb-[env(safe-area-inset-bottom)]"
      >
        <SheetDragRegion className="flex shrink-0 items-center gap-2 px-3 pb-3">
          <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground">
            <ListFilter size={16} strokeWidth={1.75} />
          </span>
          <p className="min-w-0 flex-1 text-left text-sm font-semibold tracking-tight">
            {t("filterBar.filters")}
          </p>
          {active && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTER)}
              className="shrink-0 px-2 text-xs font-medium text-muted-foreground transition-opacity hover:opacity-70"
            >
              {t("filterBar.clearAll")}
            </button>
          )}
          <button
            type="button"
            aria-label={t("filterBar.close")}
            onClick={() => closeDrawer(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </SheetDragRegion>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-2 px-1 text-[0.6875rem] font-medium uppercase tracking-wide text-caption">
            {t("filterBar.allFilters")}
          </p>
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised/40 divide-y divide-border-subtle">
            <AccordionSection
              icon={CircleDot}
              label={t("filterBar.status")}
              summary={statusSummary}
              active={filter.statuses.length > 0}
              open={expanded === "status"}
              onToggle={() => toggleSection("status")}
            >
              <MultiSelectList
                options={statusConfig}
                selected={filter.statuses}
                onToggle={(v) => toggle("statuses", v)}
                renderDot={(v) => {
                  const cfg = statusConfig.find((s) => s.value === v);
                  return (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: cfg?.color }}
                    />
                  );
                }}
              />
            </AccordionSection>

            <AccordionSection
              icon={Flag}
              label={t("filterBar.priority")}
              summary={prioritySummary}
              active={filter.priorities.length > 0}
              open={expanded === "priority"}
              onToggle={() => toggleSection("priority")}
            >
              <MultiSelectList
                options={priorityOptions}
                selected={filter.priorities}
                onToggle={(v) => toggle("priorities", v)}
                renderDot={(v) => (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: PRIORITY_COLOR[v] }}
                  />
                )}
              />
            </AccordionSection>

            <AccordionSection
              icon={Tag}
              label={t("filterBar.tags")}
              summary={tagsSummary}
              active={filter.tags.length > 0}
              open={expanded === "tags"}
              onToggle={() => toggleSection("tags")}
            >
              <MultiSelectList
                options={allLabels.map((l) => ({
                  value: l.id,
                  label: l.name,
                }))}
                selected={filter.tags}
                onToggle={(v) => toggle("tags", v)}
                renderDot={(v) => (
                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{
                      background:
                        allLabels.find((l) => l.id === v)?.color ??
                        "var(--surface-raised)",
                    }}
                  />
                )}
              />
            </AccordionSection>

            <AccordionSection
              icon={Calendar}
              label={t("filterBar.due")}
              summary={dueSummary}
              active={filter.due != null}
              open={expanded === "due"}
              onToggle={() => toggleSection("due")}
            >
              <RadioList
                options={dueRangeOptions}
                selected={filter.due}
                onSelect={(v) => onChange({ ...filter, due: v })}
              />
            </AccordionSection>

            <AccordionSection
              icon={Clock}
              label={t("filterBar.created")}
              summary={createdSummary}
              active={filter.created != null}
              open={expanded === "created"}
              onToggle={() => toggleSection("created")}
            >
              <RadioList
                options={createdRangeOptions}
                selected={filter.created}
                onSelect={(v) => onChange({ ...filter, created: v })}
              />
            </AccordionSection>
          </div>
        </div>
      </Sheet>
    </>
  );
}
