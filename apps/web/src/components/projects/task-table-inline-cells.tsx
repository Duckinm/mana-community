import { Calendar as CalendarIcon } from "@/components/icons";
import { MilestoneDiamond } from "@/components/icons/milestone-diamond";
import { TASK_PRIORITY_OPTIONS } from "@/components/projects/constants";
import { formatTaskDueDisplay } from "@/components/projects/due-helpers";
import { TaskDueDatePicker } from "@/components/projects/task-due-date-picker";
import { LabelChip } from "@/components/projects/label-chip";
import { LabelPicker } from "@/components/projects/label-picker";
import {
  milestoneDiamondClass,
  milestoneDiamondClassMuted,
} from "@/components/projects/milestone-styles";
import { PriorityBars } from "@/components/projects/priority-bars";
import {
  getTaskStatusFilterConfig,
  TASK_STATUS_ICON,
} from "@/components/projects/status-styles";
import type {
  Milestone,
  Priority,
  Status,
  Task,
} from "@/components/projects/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTimestamp, parseTimestamp } from "@/lib/timestamp";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function cellBtn(className?: string) {
  return cn(
    "flex h-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-surface-overlay",
    className,
  );
}

const cardChip =
  "inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border border-border-subtle px-2 text-xs text-muted-foreground transition-colors hover:bg-surface-overlay hover:text-foreground";

export function TaskCreatedLine({ createdAt }: { createdAt: string }) {
  const { t, i18n } = useTranslation("projects");
  const created = parseTimestamp(createdAt);
  if (!created) return null;
  const sameYear = created.getFullYear() === new Date().getFullYear();
  const pattern =
    i18n.language === "th"
      ? sameYear
        ? "d MMM"
        : "d MMM yyyy"
      : sameYear
        ? "MMM d"
        : "MMM d, yyyy";
  return (
    <p className="mt-2 text-2xs font-medium text-muted-foreground/80">
      {t("card.created", { date: formatTimestamp(createdAt, pattern) })}
    </p>
  );
}

export function InlineStatusIcon({
  task,
  onSelect,
}: {
  task: Task;
  onSelect: (status: Status) => void;
}) {
  const { t } = useTranslation("projects");
  const options = getTaskStatusFilterConfig(t);
  const Icon = TASK_STATUS_ICON[task.status];
  const color =
    options.find((o) => o.value === task.status)?.color ?? "var(--text-muted)";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cellBtn("w-7")}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon size={15} strokeWidth={2} style={{ color }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuRadioGroup
          value={task.status}
          onValueChange={(v) => onSelect(v as Status)}
        >
          {options.map((opt) => {
            const OptIcon = TASK_STATUS_ICON[opt.value];
            return (
              <DropdownMenuRadioItem
                key={opt.value}
                value={opt.value}
                className="gap-2"
              >
                <OptIcon
                  size={14}
                  strokeWidth={2}
                  style={{ color: opt.color }}
                />
                {opt.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InlineMilestoneIcon({
  task,
  milestones,
  onChange,
}: {
  task: Task;
  milestones: Milestone[];
  onChange: (milestoneId: string | null) => void;
}) {
  const { t } = useTranslation("projects");
  const active = milestones.find((m) => m.id === task.milestoneId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cellBtn("w-7")}
          title={active?.name ?? t("taskDetail.noMilestone")}
          onClick={(e) => e.stopPropagation()}
        >
          <MilestoneDiamond
            size={14}
            strokeWidth={2}
            className={
              active
                ? milestoneDiamondClass(active)
                : milestoneDiamondClassMuted()
            }
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuRadioGroup
          value={task.milestoneId ?? ""}
          onValueChange={(v) => onChange(v === "" ? null : v)}
        >
          <DropdownMenuRadioItem value="">
            <span className="flex items-center gap-2">
              <MilestoneDiamond
                size={11}
                strokeWidth={2}
                className={milestoneDiamondClassMuted()}
              />
              {t("taskDetail.noMilestone")}
            </span>
          </DropdownMenuRadioItem>
          {milestones.map((m) => (
            <DropdownMenuRadioItem key={m.id} value={m.id}>
              <span className="flex items-center gap-2">
                <MilestoneDiamond
                  size={11}
                  strokeWidth={2}
                  className={milestoneDiamondClass(m)}
                />
                {m.name}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InlinePriorityIcon({
  task,
  onSelect,
  variant = "cell",
}: {
  task: Task;
  onSelect: (priority: Priority) => void;
  variant?: "cell" | "card";
}) {
  const { t } = useTranslation("projects");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={variant === "card" ? cardChip : cellBtn("h-6 w-6 xl:h-7 xl:w-7")}
          onClick={(e) => e.stopPropagation()}
        >
          <PriorityBars priority={task.priority} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuRadioGroup
          value={task.priority}
          onValueChange={(v) => onSelect(v as Priority)}
        >
          {TASK_PRIORITY_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="gap-2"
            >
              <PriorityBars priority={opt.value} />
              {t(`priority.${opt.key}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InlineDueCompact({
  task,
  onSave,
  variant = "cell",
}: {
  task: Task;
  onSave: (due: string | null) => void;
  variant?: "cell" | "card";
}) {
  const label = formatTaskDueDisplay(task.due);

  if (variant === "card" && !task.due) return null;

  return (
    <TaskDueDatePicker
      due={task.due}
      onChange={onSave}
      align="end"
      onContentClick={(event) => event.stopPropagation()}
      trigger={
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={
            variant === "card"
              ? cardChip
              : cn(
                  cellBtn(
                    "h-6 w-auto min-w-0 px-0.5 text-2xs tabular-nums xl:h-7 xl:w-[4.5rem] xl:px-1 xl:text-xs",
                  ),
                  label ? "text-muted-foreground" : "hidden text-muted-foreground/40 xl:flex",
                )
          }
        >
          {variant === "card" && (
            <CalendarIcon
              size={12}
              strokeWidth={2}
              className="shrink-0 opacity-80"
            />
          )}
          {label || "—"}
        </button>
      }
    />
  );
}

export function InlineTagsCompact({
  task,
  onSave,
}: {
  task: Task;
  onSave: (labels: { id: string; name: string; color: string }[]) => void;
}) {
  const { t } = useTranslation("projects");
  if (task.labels.length === 0) return null;

  const visible = task.labels.slice(0, 3);
  const overflow = task.labels.length - visible.length;

  return (
    <LabelPicker selected={task.labels} onChange={onSave}>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className={cellBtn("gap-1 px-1")}
      >
        {visible.map((label) => (
          <LabelChip
            key={label.id}
            label={label}
            size="sm"
            truncate={false}
          />
        ))}
        {overflow > 0 && (
          <span className="shrink-0 text-2xs text-caption">
            {t("table.tagsMore", { count: overflow })}
          </span>
        )}
      </button>
    </LabelPicker>
  );
}
