import { CalendarLegend } from "@/components/calendar/calendar-legend";
import { Kanban, ListBullets, Settings2 } from "@/components/icons";
import type {
  CalendarDisplayOption,
  CalendarDisplayOptions,
} from "@/components/calendar/calendar-display-options";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type CalendarFilterControlProps = {
  accountColorMap: Map<string, string>;
  todoPanelOpen: boolean;
  onTodoPanelOpenChange?: (open: boolean) => void;
  showAllWork: boolean;
  onShowAllWorkChange: (value: boolean) => void;
  displayOptions: CalendarDisplayOptions;
  onToggleDisplayOption: (option: CalendarDisplayOption) => void;
};

function FilterRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-3 px-3 py-2", className)}>
      {children}
    </div>
  );
}

export function CalendarFilterControl({
  accountColorMap,
  todoPanelOpen,
  onTodoPanelOpenChange,
  showAllWork,
  onShowAllWorkChange,
  displayOptions,
  onToggleDisplayOption,
}: CalendarFilterControlProps) {
  const { t } = useTranslation("calendar");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("toolbar.displayOptions")}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-default bg-surface-card text-muted-foreground transition-colors duration-base hover:bg-surface-raised hover:text-foreground data-[state=open]:border-primary-border data-[state=open]:bg-primary-soft data-[state=open]:text-primary"
        >
          <Settings2 size={16} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden">
        <div className="border-b border-border-subtle px-3 py-2.5 text-sm font-semibold">
          {t("toolbar.displayOptions")}
        </div>
        <div className="divide-y divide-border-subtle">
          {onTodoPanelOpenChange ? (
            <FilterRow>
              <span className="flex items-center gap-2 text-sm text-foreground">
                <ListBullets size={15} className="text-muted-foreground" />
                {t("toolbar.todo")}
              </span>
              <Switch
                checked={todoPanelOpen}
                onCheckedChange={onTodoPanelOpenChange}
                aria-label={t("toolbar.todo")}
                size="sm"
              />
            </FilterRow>
          ) : null}
          <FilterRow className={cn("pl-8", !todoPanelOpen && "opacity-50")}>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Kanban size={15} className="text-muted-foreground" />
                {showAllWork
                  ? t("todoPanel.allProjectsWork")
                  : t("todoPanel.currentProjectWork")}
              </span>
              {!todoPanelOpen ? (
                <span id="calendar-show-all-work-hint" className="text-2xs text-muted-foreground">
                  {t("toolbar.enableTodoFirst")}
                </span>
              ) : null}
            </span>
            <Switch
              checked={showAllWork}
              onCheckedChange={onShowAllWorkChange}
              aria-label={
                showAllWork
                  ? t("todoPanel.allProjectsWork")
                  : t("todoPanel.currentProjectWork")
              }
              aria-describedby={!todoPanelOpen ? "calendar-show-all-work-hint" : undefined}
              disabled={!todoPanelOpen}
              size="sm"
            />
          </FilterRow>
        </div>
        <div className="border-t border-border-subtle bg-surface-raised/35 px-3 py-2.5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("legend.title")}</p>
          <CalendarLegend
            accountColorMap={accountColorMap}
            options={displayOptions}
            onToggle={onToggleDisplayOption}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
