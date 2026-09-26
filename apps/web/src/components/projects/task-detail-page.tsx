import { PRIORITY_COLOR, TASK_PRIORITY_OPTIONS } from "@/components/projects/constants";
import { formatTaskDueDisplay } from "@/components/projects/due-helpers";
import { LabelChip } from "@/components/projects/label-chip";
import { LabelPicker } from "@/components/projects/label-picker";
import { MilestoneSelect } from "@/components/projects/milestone-select";
import { PriorityBars } from "@/components/projects/priority-bars";
import type { Milestone, Priority, Status, Task, TaskPatch } from "@/components/projects/types";
import { TaskBodyEditor } from "@/components/projects/task-body-editor";
import { TaskDeleteConfirmDialog } from "@/components/projects/task-delete-confirm-dialog";
import { TaskDueDatePicker } from "@/components/projects/task-due-date-picker";
import { AiBadge } from "@/components/ui/ai-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { menuItemDestructive } from "@/components/ui/menu-styles";
import { formatTimestampTime, parseTimestamp } from "@/lib/timestamp";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  MoreHorizontal,
  Plus,
  Trash2,
} from "@/components/icons";
import { ManaSparkle } from "@/components/icons/mana-sparkle";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface StatusConfig {
  value: Status;
  label: string;
  icon: React.ElementType;
  color: string;
}

function getStatusConfig(t: (key: string) => string): StatusConfig[] {
  return [
    { value: "todo", label: t("taskStatus.todo"), icon: CircleDashed, color: "var(--text-faint)" },
    {
      value: "in-progress",
      label: t("taskStatus.inProgress"),
      icon: CircleDot,
      color: "var(--primary)",
    },
    { value: "done", label: t("taskStatus.done"), icon: CircleCheck, color: "var(--category-green)" },
    { value: "canceled", label: t("taskStatus.canceled"), icon: CircleX, color: "var(--destructive)" },
  ];
}

interface SelectOption {
  value: string;
  label: string;
  color?: string;
  swatch?: string;
  icon?: React.ElementType;
  prefix?: React.ReactNode;
}

interface SelectBadgeProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  tone?: "color" | "quiet";
}

const quietChipClass =
  "inline-flex h-7 max-w-full items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-surface-raised";

export function formatScheduledTaskTime(
  scheduledStart: string | null | undefined,
  scheduledEnd: string | null | undefined,
  dueTime: string | null | undefined,
) {
  if (!parseTimestamp(scheduledStart) || !parseTimestamp(scheduledEnd)) return dueTime ?? "";
  return `${formatTimestampTime(scheduledStart)} – ${formatTimestampTime(scheduledEnd)}`;
}

function SelectBadge({ options, value, onChange, tone = "color" }: SelectBadgeProps) {
  const active = options.find((o) => o.value === value) ?? options[0];
  const quiet = tone === "quiet";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            quiet
              ? quietChipClass
              : "flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-all"
          }
          style={
            quiet
              ? undefined
              : {
                  background: active.swatch
                    ? active.swatch + "22"
                    : active.color
                      ? active.color + "22"
                      : "var(--surface-overlay)",
                  color: active.swatch ?? active.color ?? "var(--text-faint)",
                  border: `1px solid ${active.swatch ? active.swatch + "40" : active.color ? active.color + "40" : "var(--border-default)"}`,
                }
          }
        >
          {active.icon ? (
            <active.icon
              size={12}
              strokeWidth={2}
              className="shrink-0"
              style={quiet ? { color: active.color } : undefined}
            />
          ) : active.prefix ? (
            active.prefix
          ) : active.swatch ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: active.swatch }}
            />
          ) : null}
          <span className="truncate">{active.label}</span>
          <ChevronDown
            size={11}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground/70"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v)}>
          {options.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="gap-2"
              style={{
                color: opt.color ?? opt.swatch ?? "var(--text-faint)",
              }}
            >
              <span className="flex items-center gap-2">
                {opt.icon ? (
                  <opt.icon size={11} strokeWidth={2} />
                ) : opt.prefix ? (
                  opt.prefix
                ) : opt.swatch ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: opt.swatch }}
                  />
                ) : null}
                {opt.label}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface Props {
  task: Task;
  projectName: string;
  columnLabel: string;
  milestones: Milestone[];
  onBack: () => void;
  onUpdate: (patch: TaskPatch) => void;
  onDelete: () => void;
  variant?: "page" | "overlay";
}

export function TaskDetailPage({
  task,
  projectName,
  columnLabel,
  milestones,
  onBack,
  onUpdate,
  onDelete,
  variant = "page",
}: Props) {
  const { t } = useTranslation("projects");
  const [title, setTitle] = useState(task.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(task.title);
  }, [task.id]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  function saveTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
    else setTitle(task.title);
  }

  function saveDue(due: string | null) {
    onUpdate(due ? { due } : { due, dueTime: null })
  }

  const statusOptions: SelectOption[] = getStatusConfig(t).map((o) => ({ ...o }));

  const priorityOptions: SelectOption[] = TASK_PRIORITY_OPTIONS.map((o) => ({
    value: o.value,
    label: t(`priority.${o.key}`),
    color: PRIORITY_COLOR[o.value as Priority],
    prefix: <PriorityBars priority={o.value} />,
  }));

  const taskRef = task.displayId || task.id.slice(0, 8);

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-full"
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          variant === "overlay" ? "mb-5" : "mb-5 xl:mb-8",
        )}
      >
        {variant === "page" ? (
          <button
            type="button"
            onClick={onBack}
            className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground transition-opacity hover:opacity-70"
          >
            <ArrowLeft size={15} strokeWidth={1.8} className="shrink-0" />
            <span className="truncate">{projectName}</span>
            <span className="hidden shrink-0 text-muted-foreground/50 sm:inline">/</span>
            <span className="hidden shrink-0 truncate sm:inline">{columnLabel}</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-md bg-card-active px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {taskRef}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card-active data-[state=open]:bg-card-active xl:size-7"
              >
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className={menuItemDestructive}
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 size={12} />
                {t("taskDetail.deleteTask")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TaskDeleteConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            taskTitle={task.title}
            onConfirm={() => {
              onDelete();
              onBack();
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10">
        <div className="min-w-0 flex-1">
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveTitle();
                titleRef.current?.blur();
              }
              if (e.key === "Escape") {
                setTitle(task.title);
                titleRef.current?.blur();
              }
            }}
            rows={1}
            placeholder={t("taskDetail.titlePlaceholder")}
            className="w-full resize-none bg-transparent text-xl font-semibold leading-snug text-foreground outline-none placeholder:text-muted-foreground/40 [overflow-wrap:anywhere] lg:text-[1.75rem] lg:font-bold lg:leading-tight"
          />

          <TaskBodyEditor
            key={task.id}
            taskId={task.id}
            body={task.body}
            onChange={(body) => onUpdate({ body })}
            placeholder={t("createTask.descriptionPlaceholder")}
          />

          <div className="mt-4 lg:hidden">
            <div className="rounded-xl border border-border-subtle bg-surface-card/80 p-1.5">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                <SelectBadge
                  tone="quiet"
                  options={statusOptions}
                  value={task.status}
                  onChange={(v) => onUpdate({ status: v as Status })}
                />
                <SelectBadge
                  tone="quiet"
                  options={priorityOptions}
                  value={task.priority}
                  onChange={(v) => onUpdate({ priority: v as Priority })}
                />
                <DueField
                  due={task.due}
                  onSave={saveDue}
                  align="start"
                  className={quietChipClass}
                />
                <DueTimeField
                  due={task.due}
                  dueTime={task.dueTime}
                  scheduledStart={task.scheduledStart}
                  scheduledEnd={task.scheduledEnd}
                  onSave={(dueTime) => onUpdate({ dueTime })}
                  className={quietChipClass}
                />
              </div>
              <div className="mt-1 flex items-center gap-1 border-t border-border-subtle/80 pt-1">
                <MilestoneSelect
                  value={task.milestoneId ?? null}
                  milestones={milestones}
                  onChange={(milestoneId) => onUpdate({ milestoneId })}
                  className={cn(
                    quietChipClass,
                    "max-w-[8.5rem] border-0 bg-transparent px-2 py-0 shadow-none hover:bg-surface-raised",
                  )}
                />
                <LabelPicker
                  selected={task.labels}
                  onChange={(next) =>
                    onUpdate({ labels: next, labelIds: next.map((l) => l.id) })
                  }
                >
                  <div className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-1">
                    {task.labels.length === 0 ? (
                      <button
                        type="button"
                        className={cn(quietChipClass, "text-muted-foreground")}
                      >
                        <Plus size={12} strokeWidth={2} />
                        {t("labelPicker.addLabel")}
                      </button>
                    ) : (
                      <>
                        {task.labels.map((label) => (
                          <LabelChip
                            key={label.id}
                            label={label}
                            size="sm"
                            className="h-7 rounded-lg"
                          />
                        ))}
                        <button
                          type="button"
                          className={cn(quietChipClass, "px-1.5 text-muted-foreground")}
                          aria-label={t("labelPicker.addLabel")}
                        >
                          <Plus size={12} strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </div>
                </LabelPicker>
                {task.aiAssigned ? (
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1 pr-1 text-2xs font-medium text-primary">
                    <ManaSparkle size={10} aria-hidden="true" />
                    {t("board.aiAssigned")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden w-[13.5rem] shrink-0 overflow-hidden rounded-2xl surface-card lg:block">
          <div className="px-4 pb-1 pt-4">
            <p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("taskDetail.properties")}
            </p>
          </div>

          <PropRow label={t("taskDetail.status")}>
            <SelectBadge
              options={statusOptions}
              value={task.status}
              onChange={(v) => onUpdate({ status: v as Status })}
            />
          </PropRow>

          <PropRow label={t("taskDetail.priority")}>
            <SelectBadge
              options={priorityOptions}
              value={task.priority}
              onChange={(v) => onUpdate({ priority: v as Priority })}
            />
          </PropRow>

          <PropRow label={t("taskDetail.milestone")}>
            <MilestoneSelect
              value={task.milestoneId ?? null}
              milestones={milestones}
              onChange={(milestoneId) => onUpdate({ milestoneId })}
              className="max-w-[9.5rem] px-2 py-0.5"
            />
          </PropRow>

          <PropRow label={t("taskDetail.tag")}>
            <LabelPicker
              selected={task.labels}
              onChange={(next) =>
                onUpdate({ labels: next, labelIds: next.map((l) => l.id) })
              }
            >
              <div className="flex max-w-[10rem] cursor-pointer flex-wrap items-center justify-end gap-1">
                {task.labels.map((label) => (
                  <LabelChip key={label.id} label={label} size="sm" />
                ))}
                <button
                  type="button"
                  className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card-active"
                >
                  <Plus size={12} strokeWidth={2} />
                </button>
              </div>
            </LabelPicker>
          </PropRow>

          <PropRow label={t("taskDetail.due")}>
            <DueField
              due={task.due}
              onSave={saveDue}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity hover:opacity-70"
            />
          </PropRow>

          <PropRow label={t("taskDetail.dueTime")} last={!task.aiAssigned}>
            <DueTimeField
              due={task.due}
              dueTime={task.dueTime}
              scheduledStart={task.scheduledStart}
              scheduledEnd={task.scheduledEnd}
              onSave={(dueTime) => onUpdate({ dueTime })}
            />
          </PropRow>

          {task.aiAssigned ? (
            <PropRow label={t("taskDetail.aiAssigned")} last>
              <AiBadge label={t("board.aiAssigned")} />
            </PropRow>
          ) : null}
        </aside>
      </div>
    </motion.div>
  );
}

function DueTimeField({
  due,
  dueTime,
  scheduledStart,
  scheduledEnd,
  onSave,
  className,
}: {
  due: string | null | undefined;
  dueTime: string | null | undefined;
  scheduledStart: string | null | undefined;
  scheduledEnd: string | null | undefined;
  onSave: (dueTime: string | null) => void;
  className?: string;
}) {
  const { t } = useTranslation("projects");

  if (!due) {
    return <span className="text-xs text-muted-foreground">{t("taskDetail.setDateFirst")}</span>;
  }

  if (scheduledStart && scheduledEnd) {
    return (
      <span className={cn("text-xs tabular-nums text-muted-foreground", className)}>
        {formatScheduledTaskTime(scheduledStart, scheduledEnd, dueTime)}
      </span>
    );
  }

  return (
    <label className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <input
        type="time"
        value={dueTime ?? ""}
        onChange={(event) => onSave(event.target.value || null)}
        className="min-w-0 bg-transparent text-right outline-none [color-scheme:inherit]"
        aria-label={t("taskDetail.dueTime")}
      />
    </label>
  );
}

function DueField({
  due,
  onSave,
  align = "end",
  className,
}: {
  due: string | null | undefined;
  onSave: (due: string | null) => void;
  align?: "start" | "end";
  className?: string;
}) {
  const { t } = useTranslation("projects");

  return (
    <TaskDueDatePicker
      due={due}
      onChange={onSave}
      align={align}
      trigger={
        <button type="button" className={className}>
          <CalendarDays size={12} strokeWidth={1.8} />
          {formatTaskDueDisplay(due) || t("taskDetail.setDate")}
        </button>
      }
    />
  );
}

function PropRow({
  label,
  sub,
  children,
  last,
  column,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
  last?: boolean;
  column?: boolean;
}) {
  return (
    <div
      className={cn(
        "gap-2 border-t border-border-subtle px-3 xl:px-4",
        column
          ? "flex flex-col py-1.5 xl:py-3"
          : "flex items-center justify-between gap-2 py-1.5 xl:gap-3 xl:py-3",
        last && "pb-2.5 xl:pb-4",
      )}
    >
      <div className="min-w-0 shrink-0">
        <p className="text-2xs text-muted-foreground xl:text-xs">{label}</p>
        {sub && (
          <p className="mt-0.5 hidden text-2xs text-muted-foreground sm:block">
            {sub}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
