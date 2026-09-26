import {
  ArrowsIn,
  ArrowsOut,
  CalendarDays,
  Check,
  KeyReturn,
  Tag,
} from "@/components/icons";
import {
  formatDueLabel,
  formatTaskDueDisplay,
  getTaskDueQuickDate,
  isSameDueDay,
  parseDueNaturalLanguage,
  parseDueValue,
  TASK_DUE_QUICK_KEYS,
  type TaskDueQuickKey,
} from "@/components/projects/due-helpers";
import { LabelChip } from "@/components/projects/label-chip";
import { LabelPicker } from "@/components/projects/label-picker";
import { PriorityBars } from "@/components/projects/priority-bars";
import { TaskDueDatePicker } from "@/components/projects/task-due-date-picker";
import { ProjectDescriptionEditor } from "@/components/projects/project-description-editor";
import {
  getTaskStatusFilterConfig,
  TASK_STATUS_ICON,
} from "@/components/projects/status-styles";
import type { Label, Priority, Status } from "@/components/projects/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { ApiTaskCreateBody } from "@/lib/api-types";
import i18next from "@/lib/i18n";
import type { TiptapDoc } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const PRIORITY_OPTIONS: { value: Priority; key: string }[] = [
  { value: "high", key: "high" },
  { value: "med", key: "med" },
  { value: "low", key: "low" },
];

const DUE_QUICK_LABEL_KEY = {
  today: "dueToday",
  tomorrow: "dueTomorrow",
  nextWeek: "dueNextWeek",
} satisfies Record<TaskDueQuickKey, string>;

const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, {
      message: i18next.t("createTask.titleRequired", { ns: "projects" }),
    }),
  status: z.string(),
  priority: z.enum(["high", "med", "low"]),
  labels: z.array(
    z.object({ id: z.string(), name: z.string(), color: z.string() }),
  ),
  due: z.string(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface Props {
  defaultColumnId: Status;
  onClose: () => void;
  onCreate: (columnId: Status, task: ApiTaskCreateBody) => void;
}

export function CreateTaskDialog({
  defaultColumnId,
  onClose,
  onCreate,
}: Props) {
  const { t } = useTranslation("projects");
  const STATUS_OPTIONS = getTaskStatusFilterConfig(t);
  const [createMore, setCreateMore] = useState(false);
  const [body, setBody] = useState<TiptapDoc | null>(null);
  const [expanded, setExpanded] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      title: "",
      status: defaultColumnId as string,
      priority: "med" as Priority,
      labels: [] as Label[],
      due: "",
    } as TaskFormValues,
    validators: { onSubmit: taskSchema },
    onSubmit: ({ value }) => {
      onCreate(value.status as Status, {
        title: value.title.trim(),
        due: value.due || null,
        priority: value.priority,
        labelIds: value.labels.map((l) => l.id),
        body,
        aiAssigned: false,
      });
      if (createMore) {
        form.reset({ ...value, title: "" });
        setBody(null);
        setTimeout(() => titleRef.current?.focus(), 0);
      } else {
        onClose();
      }
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0 transition-[max-width,max-height]",
          expanded
            ? "max-h-[min(90vh,860px)] max-w-3xl"
            : "max-h-[min(85vh,620px)] max-w-lg",
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          // Below xl the dialog is a full-width drawer, so widening it does nothing —
          // the control would only crowd the close button.
          className="absolute right-12 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 max-xl:hidden"
          aria-label={
            expanded ? t("createTask.shrink") : t("createTask.enlarge")
          }
        >
          {expanded ? (
            <ArrowsIn className="h-4 w-4" />
          ) : (
            <ArrowsOut className="h-4 w-4" />
          )}
        </button>

        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold">
            {t("createTask.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("createTask.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3 pt-4">
            <form.Field name="title">
              {(field) => (
                <input
                  ref={titleRef}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      form.handleSubmit();
                    }
                  }}
                  placeholder={t("createTask.titlePlaceholder")}
                  autoFocus
                  className="w-full bg-transparent text-lg font-semibold text-foreground placeholder-foreground-200 outline-none leading-snug"
                />
              )}
            </form.Field>

            <ProjectDescriptionEditor
              value={body}
              onChange={setBody}
              placeholder={t("createTask.descriptionPlaceholder")}
              debounceMs={0}
              className={cn(
                "text-sm",
                expanded
                  ? "min-h-64 [&_.ProseMirror]:min-h-64"
                  : "min-h-16 [&_.ProseMirror]:min-h-16",
              )}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <form.Field name="status">
                {(field) => (
                  <StatusPill
                    value={field.state.value as Status}
                    options={STATUS_OPTIONS}
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>

              <form.Field name="priority">
                {(field) => (
                  <PriorityPill
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>

              <form.Field name="labels">
                {(field) => (
                  <LabelsPill
                    selected={field.state.value}
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>

              <form.Field name="due">
                {(field) => (
                  <DueField
                    value={field.state.value}
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>
            </div>
          </div>

          <div className="drawer-footer justify-between max-xl:flex-col max-xl:items-stretch max-xl:gap-2.5">
            <label className="flex cursor-pointer select-none items-center gap-2 max-xl:min-h-11 max-xl:gap-3">
              <Switch
                checked={createMore}
                onCheckedChange={setCreateMore}
                size="sm"
              />
              <span className="text-xs text-muted-foreground max-xl:text-sm">
                {t("createTask.createMore")}
              </span>
            </label>

            <div className="flex items-center gap-1.5 max-xl:w-full max-xl:gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
              >
                {t("createTask.cancel")}
              </button>
              <form.Subscribe
                selector={(s) => [s.values.title, s.canSubmit] as const}
              >
                {([title, canSubmit]) => (
                  <button
                    type="submit"
                    disabled={!title.trim() || !canSubmit}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                  >
                    {t("createTask.create")}
                    <KeyReturn
                      size={13}
                      weight="bold"
                      className="opacity-70 max-xl:hidden"
                    />
                  </button>
                )}
              </form.Subscribe>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const PILL_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-overlay";

function StatusPill({
  value,
  options,
  onChange,
}: {
  value: Status;
  options: ReturnType<typeof getTaskStatusFilterConfig>;
  onChange: (status: string) => void;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  const Icon = TASK_STATUS_ICON[current.value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={PILL_CLASS}>
          <Icon size={13} strokeWidth={2} className="shrink-0" style={{ color: current.color }} />
          {current.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((opt) => {
            const OptIcon = TASK_STATUS_ICON[opt.value];
            return (
              <DropdownMenuRadioItem
                key={opt.value}
                value={opt.value}
                className="gap-2"
              >
                <OptIcon size={14} strokeWidth={2} style={{ color: opt.color }} />
                {opt.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityPill({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (priority: Priority) => void;
}) {
  const { t } = useTranslation("projects");
  const current = PRIORITY_OPTIONS.find((o) => o.value === value)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={PILL_CLASS}>
          <PriorityBars priority={current.value} />
          {t(`priority.${current.key}`)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as Priority)}
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value} className="gap-2">
              <PriorityBars priority={opt.value} />
              {t(`priority.${opt.key}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LabelsPill({
  selected,
  onChange,
}: {
  selected: Label[];
  onChange: (labels: Label[]) => void;
}) {
  const { t } = useTranslation("projects");

  return (
    <LabelPicker selected={selected} onChange={onChange}>
      <button type="button" className={PILL_CLASS}>
        <Tag size={12} strokeWidth={2} className="shrink-0" />
        {selected.length === 0 ? (
          t("createTask.tag")
        ) : (
          <span className="flex items-center gap-1">
            {selected.map((label) => (
              <LabelChip key={label.id} label={label} size="sm" truncate={false} />
            ))}
          </span>
        )}
      </button>
    </LabelPicker>
  );
}

function DueField({
  value,
  onChange,
}: {
  value: string;
  onChange: (due: string) => void;
}) {
  const { t, i18n } = useTranslation("projects");
  const selectedDate = useMemo(() => parseDueValue(value), [value]);
  const pattern = i18n.language === "th" ? "EEE d MMM" : "EEE, MMM d";

  return (
    <TaskDueDatePicker
      due={value}
      onChange={(due) => onChange(due ?? "")}
      align="start"
      showClear={false}
      trigger={
        <button type="button" className={PILL_CLASS}>
          <CalendarDays size={12} strokeWidth={2} className="shrink-0" />
          {selectedDate ? formatTaskDueDisplay(value, pattern) : t("createTask.due")}
        </button>
      }
      beforeCalendar={(close) => (
        <>
          <div className="flex flex-wrap gap-1.5 border-b border-border-subtle p-2">
          {TASK_DUE_QUICK_KEYS.map((key) => {
            const date = getTaskDueQuickDate(key);
            const active = isSameDueDay(selectedDate, date);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(active ? "" : formatDueLabel(date));
                  close();
                }}
                className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-overlay"
              >
                {active && <Check size={11} strokeWidth={2.5} className="shrink-0" />}
                {t(`createTask.${DUE_QUICK_LABEL_KEY[key]}`)}
              </button>
            );
          })}
          </div>
          <div className="border-b border-border-subtle p-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const parsed = parseDueNaturalLanguage(value);
                if (parsed) onChange(formatDueLabel(parsed));
                close();
              }
            }}
            placeholder={t("createTask.setDueDate")}
            className="w-full bg-transparent px-1 text-xs text-foreground outline-none placeholder:text-caption"
          />
          </div>
        </>
      )}
    />
  );
}
