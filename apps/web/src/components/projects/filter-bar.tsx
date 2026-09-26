import { PRIORITY_COLOR } from "@/components/projects/constants";
import {
  EMPTY_FILTER,
  isFilterActive,
  type TaskFilter,
} from "@/components/projects/task-filter-matching";
import { MobileTaskFilterButton } from "@/components/projects/task-filter-drawer";
import { useTaskFilterOptions } from "@/components/projects/use-task-filter-options";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { menuItem, menuList, menuSurface } from "@/components/ui/menu-styles";
import { Check, ChevronDown, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useState } from "react";

function DotSummary({
  dots,
}: {
  dots: { key: string; label: string; color: string; rounded?: "sm" | "full" }[];
}) {
  const visible = dots.slice(0, 3);
  const extra = dots.length - visible.length;
  return (
    <span className="ml-0.5 flex items-center gap-1">
      {visible.map(({ key, label, color, rounded = "full" }) => (
        <span key={key} className="flex items-center gap-1">
          <span
            className={`h-2 w-2 shrink-0 ${rounded === "sm" ? "rounded-sm" : "rounded-full"}`}
            style={{ background: color }}
          />
          {label}
        </span>
      ))}
      {extra > 0 && (
        <span className="ml-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          +{extra}
        </span>
      )}
    </span>
  );
}

function FilterChip({
  label,
  active,
  summary,
  onClear,
  children,
}: {
  label: string;
  active: boolean;
  summary?: React.ReactNode;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-stretch">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: active ? "var(--primary-soft)" : "transparent",
              color: active ? "var(--primary)" : "var(--text-muted)",
              border: `1px solid ${active ? "var(--primary-border)" : "var(--border-default)"}`,
              borderRight: active ? "none" : `1px solid var(--border-default)`,
              borderRadius: active ? "0.5rem 0 0 0.5rem" : "0.5rem",
            }}
          >
            {label}
            {active && summary != null ? (
              <>
                <span className="mx-0.5 opacity-40">:</span>
                {summary}
              </>
            ) : (
              <ChevronDown
                size={14}
                strokeWidth={2}
                className="shrink-0 opacity-50"
              />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(menuSurface, "min-w-[188px] overflow-hidden p-0")}
        >
          {children}
        </PopoverContent>
      </Popover>

      {active && (
        <button
          onClick={onClear}
          className="flex items-center justify-center px-1.5 transition-opacity hover:opacity-70"
          style={{
            background: "var(--primary-soft)",
            color: "var(--primary)",
            border: "1px solid var(--primary-border)",
            borderLeft: "none",
            borderRadius: "0 0.5rem 0.5rem 0",
          }}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

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
    <div className={menuList}>
      {options.map(({ value, label }) => {
        const checked = selected.includes(value);
        return (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={cn(
              menuItem,
              "w-full cursor-pointer text-left hover:bg-surface-raised",
            )}
          >
            <span
              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded transition-all"
              style={{
                background: checked ? "var(--primary)" : "transparent",
                border: `1.5px solid ${checked ? "var(--primary)" : "var(--text-muted)"}`,
              }}
            >
              {checked && (
                <Check
                  size={9}
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
    <div className={menuList}>
      {options.map(({ value, label }) => {
        const active = selected === value;
        return (
          <button
            key={value}
            onClick={() => onSelect(active ? null : value)}
            className={cn(
              menuItem,
              "w-full cursor-pointer justify-between hover:bg-surface-raised",
              active && "bg-primary-soft text-primary",
            )}
          >
            {label}
            {active && (
              <Check size={10} strokeWidth={2.5} className="text-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DesktopFilterChips({
  filter,
  onChange,
}: {
  filter: TaskFilter;
  onChange: (f: TaskFilter) => void;
}) {
  const { t, allLabels, statusConfig, priorityOptions, dueRangeOptions, createdRangeOptions, toggle } = useTaskFilterOptions(filter, onChange);

  const active = isFilterActive(filter);

  return (
    <div className="hidden items-center gap-2 xl:flex xl:flex-wrap">
      <FilterChip
        label={t("filterBar.status")}
        active={filter.statuses.length > 0}
        summary={
          <DotSummary
            dots={filter.statuses.map((s) => ({
              key: s,
              label: statusConfig.find((x) => x.value === s)?.label ?? s,
              color:
                statusConfig.find((x) => x.value === s)?.color ??
                "var(--text-muted)",
            }))}
          />
        }
        onClear={() => onChange({ ...filter, statuses: [] })}
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
      </FilterChip>

      <FilterChip
        label={t("filterBar.priority")}
        active={filter.priorities.length > 0}
        summary={
          <DotSummary
            dots={filter.priorities.map((p) => ({
              key: p,
              label: priorityOptions.find((x) => x.value === p)?.label ?? p,
              color: PRIORITY_COLOR[p],
            }))}
          />
        }
        onClear={() => onChange({ ...filter, priorities: [] })}
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
      </FilterChip>

      <FilterChip
        label={t("filterBar.tags")}
        active={filter.tags.length > 0}
        summary={
          <DotSummary
            dots={filter.tags.map((id) => {
              const label = allLabels.find((l) => l.id === id);
              return {
                key: id,
                label: label?.name ?? id,
                color: label?.color ?? "var(--surface-raised)",
                rounded: "sm" as const,
              };
            })}
          />
        }
        onClear={() => onChange({ ...filter, tags: [] })}
      >
        <MultiSelectList
          options={allLabels.map((l) => ({ value: l.id, label: l.name }))}
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
      </FilterChip>

      <FilterChip
        label={t("filterBar.due")}
        active={filter.due != null}
        summary={dueRangeOptions.find((r) => r.value === filter.due)?.label}
        onClear={() => onChange({ ...filter, due: null })}
      >
        <RadioList
          options={dueRangeOptions}
          selected={filter.due}
          onSelect={(v) => onChange({ ...filter, due: v })}
        />
      </FilterChip>

      <FilterChip
        label={t("filterBar.created")}
        active={filter.created != null}
        summary={
          createdRangeOptions.find((r) => r.value === filter.created)?.label
        }
        onClear={() => onChange({ ...filter, created: null })}
      >
        <RadioList
          options={createdRangeOptions}
          selected={filter.created}
          onSelect={(v) => onChange({ ...filter, created: v })}
        />
      </FilterChip>

      {active && (
        <button
          onClick={() => onChange(EMPTY_FILTER)}
          className="ml-1 shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground transition-opacity hover:opacity-70"
        >
          {t("filterBar.clearAll")}
        </button>
      )}
    </div>
  );
}

export function FilterBar({
  filter,
  onChange,
}: {
  filter: TaskFilter;
  onChange: (f: TaskFilter) => void;
}) {
  return (
    <>
      <div className="xl:hidden">
        <MobileTaskFilterButton filter={filter} onChange={onChange} />
      </div>
      <DesktopFilterChips filter={filter} onChange={onChange} />
    </>
  );
}
