import { CalendarTitlePicker } from "@/components/calendar/calendar-title-picker";
import { CalendarFilterControl } from "@/components/calendar/calendar-filter-control";
import type {
  CalendarDisplayOption,
  CalendarDisplayOptions,
} from "@/components/calendar/calendar-display-options";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const VIEWS = [
  { id: "dayGridMonth", labelKey: "month" },
  { id: "timeGridWeek", labelKey: "week" },
  { id: "timeGridDay", labelKey: "day" },
] as const;

const CONTROL_SHELL =
  "inline-flex items-center rounded-lg border border-border-subtle bg-transparent";

type CalendarToolbarProps = {
  activeDate: Date;
  currentView: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (view: string) => void;
  onPickDate: (date: Date) => void;
  onCreate: () => void;
  accountColorMap: Map<string, string>;
  todoPanelOpen?: boolean;
  onTodoPanelOpenChange?: (open: boolean) => void;
  showAllWork: boolean;
  onShowAllWorkChange: (value: boolean) => void;
  displayOptions: CalendarDisplayOptions;
  onToggleDisplayOption: (option: CalendarDisplayOption) => void;
};

function NavIconButton({
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-base hover:bg-surface-raised hover:text-foreground"
    >
      {children}
    </button>
  );
}

function ViewSegment({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors duration-base",
        active
          ? "bg-primary-soft text-primary"
          : "text-muted-foreground hover:bg-surface-raised/70 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function CalendarToolbar({
  activeDate,
  currentView,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  onPickDate,
  onCreate,
  accountColorMap,
  todoPanelOpen,
  onTodoPanelOpenChange,
  showAllWork,
  onShowAllWorkChange,
  displayOptions,
  onToggleDisplayOption,
}: CalendarToolbarProps) {
  const { t } = useTranslation("calendar");

  return (
    <div className="calendar-toolbar flex flex-col gap-2 border-b border-border-subtle px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <CalendarTitlePicker
            activeDate={activeDate}
            onSelectDate={onPickDate}
          />
        </div>
        <div className={cn(CONTROL_SHELL, "shrink-0 gap-0.5 p-0.5")}>
          <NavIconButton onClick={onPrev} aria-label={t("toolbar.prev")}>
            <ChevronLeft size={14} strokeWidth={2.5} />
          </NavIconButton>
          <NavIconButton onClick={onNext} aria-label={t("toolbar.next")}>
            <ChevronRight size={14} strokeWidth={2.5} />
          </NavIconButton>
          <div
            className="mx-0.5 h-4 w-px shrink-0 bg-border-subtle"
            aria-hidden
          />
          <button
            type="button"
            onClick={onToday}
            className="inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-base hover:bg-surface-raised hover:text-foreground"
          >
            {t("toolbar.today")}
          </button>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2">
        <div
          className={cn(CONTROL_SHELL, "h-8 shrink-0 gap-0.5 p-0.5")}
          role="group"
          aria-label={t("title")}
        >
          {VIEWS.map((view) => (
            <ViewSegment
              key={view.id}
              active={currentView === view.id}
              onClick={() => onChangeView(view.id)}
            >
              {t(`toolbar.${view.labelKey}`)}
            </ViewSegment>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CalendarFilterControl
            accountColorMap={accountColorMap}
            todoPanelOpen={todoPanelOpen ?? false}
            onTodoPanelOpenChange={onTodoPanelOpenChange}
            showAllWork={showAllWork}
            onShowAllWorkChange={onShowAllWorkChange}
            displayOptions={displayOptions}
            onToggleDisplayOption={onToggleDisplayOption}
          />
          <button
            type="button"
            onClick={onCreate}
            aria-label={t("toolbar.newEvent")}
            className="inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border-default bg-surface-card text-foreground transition-colors duration-base hover:bg-surface-raised sm:h-9 sm:w-auto sm:px-3"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden text-xs font-medium sm:inline">
              {t("toolbar.newEvent")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
