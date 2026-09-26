import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import FullCalendar from "@fullcalendar/react";
import thLocale from "@fullcalendar/core/locales/th";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, {
  Draggable,
  type DropArg,
} from "@fullcalendar/interaction";
import type {
  DayHeaderContentArg,
  EventApi,
  EventClickArg,
  EventDropArg,
  EventMountArg,
} from "@fullcalendar/core";
import rrulePlugin from "@fullcalendar/rrule";
import { AnimatePresence, motion } from "framer-motion";
import type {
  CalendarEvent,
  CalendarDateRange,
  CalendarEventInput,
  CalendarOverlay,
} from "@/components/calendar/types";
import {
  calendarEventToFullCalendar,
  fullCalendarDropToPatch,
  instanceStartFromEvent,
  overlayToFullCalendar,
  taskToFullCalendar,
} from "@/components/calendar/calendar-event-mapper";
import {
  accountColorVar,
  buildAccountColorMap,
} from "@/components/calendar/account-colors";
import { useCalendarConnection } from "@/hooks/use-calendar-connection";
import {
  CalendarContextMenu,
  type CalendarContextMenuItem,
} from "@/components/calendar/calendar-context-menu";
import {
  Eye,
  Pencil,
  Plus,
  Trash2,
  X,
  ArrowUpRight,
} from "@/components/icons";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import {
  DEFAULT_CALENDAR_DISPLAY_OPTIONS,
  isCalendarEventVisible,
  isCalendarOverlayVisible,
  type CalendarDisplayOption,
  type CalendarDisplayOptions,
} from "@/components/calendar/calendar-display-options";
import {
  formatCalendarHeaderDate,
  formatCalendarWeekdayLetter,
} from "@/components/calendar/calendar-format";
import { calendarDefaultsFromPointer } from "@/components/calendar/calendar-slot-from-pointer";
import { calendarEventContent } from "@/components/calendar/calendar-event-content";
import { TodoPanel } from "@/components/calendar/todo-panel";
import { motionEase } from "@/lib/motion";
import { parseDueValue } from "@/components/projects/due-helpers";
import { toCalendarDateString } from "@/lib/calendar-date";
import type { Task } from "@/components/projects/types";

type CalendarViewProps = {
  events: CalendarEvent[];
  overlays?: CalendarOverlay[];
  isLoading?: boolean;
  focusDate?: Date | null;
  onRangeChange: (range: CalendarDateRange) => void;
  onCreate: (defaults: Partial<CalendarEventInput>) => void;
  onSelectEvent: (event: CalendarEvent, instanceStart?: string) => void;
  onSelectOverlay: (overlay: CalendarOverlay) => void;
  onMove: (
    id: string,
    patch: ReturnType<typeof fullCalendarDropToPatch>,
  ) => Promise<void>;
  tasks?: (Task & { projectId: string })[];
  todoPanelOpen?: boolean;
  onTodoPanelOpenChange?: (value: boolean) => void;
  onTaskDrop?: (
    taskId: string,
    projectId: string,
    date: Date,
  ) => Promise<boolean>;
  onTaskSchedule?: (
    taskId: string,
    projectId: string,
    start: Date,
    end: Date,
  ) => Promise<void>;
  onSelectTask?: (taskId: string, projectId: string) => void;
  onEditEvent?: (event: CalendarEvent, instanceStart?: string) => void;
  onDeleteEvent?: (event: CalendarEvent, instanceStart?: string) => void;
  onClearTaskDue?: (taskId: string, projectId: string) => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  items: CalendarContextMenuItem[];
};

type CalendarItemTarget =
  | { type: "task"; taskId: string; projectId: string }
  | { type: "overlay"; overlay: CalendarOverlay }
  | { type: "event"; event: CalendarEvent; instanceStart?: string };

const CALENDAR_VIEW_STORAGE_KEY = "calendar-view";
const CALENDAR_VIEW_IDS = ["dayGridMonth", "timeGridWeek", "timeGridDay"] as const;

type CalendarViewId = (typeof CALENDAR_VIEW_IDS)[number];

function isCalendarView(value: string | null): value is CalendarViewId {
  return CALENDAR_VIEW_IDS.includes(value as CalendarViewId);
}

export function resolveCalendarView(value: string | null, isMobile: boolean): CalendarViewId {
  if (isCalendarView(value)) return value;
  return isMobile ? "timeGridDay" : "dayGridMonth";
}

export async function applyCalendarEventResize(
  arg: {
    event: {
      id: string;
      allDay: boolean;
      start: Date | null;
      end: Date | null;
      extendedProps: {
        kind?: string;
        source?: string;
        scheduled?: boolean;
        taskId?: string;
        projectId?: string;
      };
    };
    revert: () => void;
  },
  onMove: CalendarViewProps["onMove"],
  onTaskSchedule?: CalendarViewProps["onTaskSchedule"],
) {
  const props = arg.event.extendedProps;
  if (!props.kind && props.source !== "google") {
    const patch = fullCalendarDropToPatch(arg);
    if (Object.keys(patch).length === 0) {
      arg.revert();
      return;
    }
    try {
      await onMove(arg.event.id, patch);
    } catch {
      arg.revert();
    }
    return;
  }
  if (
    props.kind !== "task" ||
    !props.taskId ||
    !props.projectId ||
    arg.event.allDay ||
    !arg.event.start ||
    !arg.event.end ||
    !onTaskSchedule
  ) {
    arg.revert();
    return;
  }
  try {
    await onTaskSchedule(
      props.taskId,
      props.projectId,
      arg.event.start,
      arg.event.end,
    );
  } catch {
    arg.revert();
  }
}

function usePersistedFlag(key: string, fallback: boolean) {
  const [value, setValue] = useState(
    () => (localStorage.getItem(key) ?? String(fallback)) === "true",
  );

  return [
    value,
    (next: boolean) => {
      setValue(next);
      localStorage.setItem(key, String(next));
    },
  ] as const;
}

function useCalendarDisplayOptions() {
  const [options, setOptions] = useState<CalendarDisplayOptions>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("calendar-display-options") ?? "{}") as Partial<CalendarDisplayOptions>;
      return {
        ...DEFAULT_CALENDAR_DISPLAY_OPTIONS,
        ...Object.fromEntries(
          Object.entries(saved).filter(([, value]) => typeof value === "boolean"),
        ),
      };
    } catch {
      return DEFAULT_CALENDAR_DISPLAY_OPTIONS;
    }
  });

  function toggle(option: CalendarDisplayOption) {
    setOptions((previous) => {
      const next = { ...previous, [option]: !previous[option] };
      try {
        localStorage.setItem("calendar-display-options", JSON.stringify(next));
      } catch {
        // The current display choices still apply when storage is unavailable.
      }
      return next;
    });
  }

  return [options, toggle] as const;
}

export function CalendarView({
  events,
  overlays = [],
  isLoading,
  focusDate,
  onRangeChange,
  onCreate,
  onSelectEvent,
  onSelectOverlay,
  onMove,
  tasks = [],
  todoPanelOpen = false,
  onTodoPanelOpenChange,
  onTaskDrop,
  onTaskSchedule,
  onSelectTask,
  onEditEvent,
  onDeleteEvent,
  onClearTaskDue,
}: CalendarViewProps) {
  const { t, i18n } = useTranslation("calendar");
  const calendarRef = useRef<FullCalendar>(null);
  const calendarBoxRef = useRef<HTMLDivElement>(null);
  const todoPanelRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [currentView, setCurrentView] = useState(() => {
    try {
      return resolveCalendarView(
        localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY),
        window.matchMedia("(max-width: 639px)").matches,
      );
    } catch {
      return resolveCalendarView(null, window.matchMedia("(max-width: 639px)").matches);
    }
  });
  const [taskDropEnabled, setTaskDropEnabled] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  const [showAllWork, setShowAllWork] = usePersistedFlag(
    "calendar-show-all-work",
    false,
  );
  const [displayOptions, toggleDisplayOption] = useCalendarDisplayOptions();
  const { connection } = useCalendarConnection();
  const accountColorMap = useMemo(
    () =>
      buildAccountColorMap(
        (connection?.calendars ?? []).map((c) => c.accountEmail),
      ),
    [connection],
  );

  // FC doesn't watch its container; the app sidebar and the to-do panel both
  // animate widths around it, so re-measure on any box resize.
  useEffect(() => {
    const el = calendarBoxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      calendarRef.current?.getApi().updateSize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ponytail: a fresh Date identity is the "go there" signal, so saving twice on
  // the same day still moves the view — no nonce to thread through.
  useEffect(() => {
    if (focusDate) calendarRef.current?.getApi().gotoDate(focusDate);
  }, [focusDate]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setTaskDropEnabled(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Todo → calendar drag is desktop-only; mobile keeps the panel for tap/open.
  useEffect(() => {
    if (!taskDropEnabled || !todoPanelOpen || !todoPanelRef.current) return;
    const draggable = new Draggable(todoPanelRef.current, {
      itemSelector: "[data-task-id]",
    });
    // FC hardcodes 0ms mouse delay for external draggables; this listener runs after FC's
    // own pointerdown handler and re-applies a hold-to-drag delay so stray clicks don't drag.
    draggable.dragging.emitter.on("pointerdown", () => {
      draggable.dragging.delay = 200;
    });
    return () => draggable.destroy();
  }, [todoPanelOpen, taskDropEnabled]);

  function renderDayHeader(arg: DayHeaderContentArg) {
    const letter = formatCalendarWeekdayLetter(arg.date, i18n.language);
    if (arg.view.type.startsWith("dayGrid")) {
      const el = document.createElement("span");
      el.className = "calendar-day-header-weekday";
      el.textContent = letter;
      return { domNodes: [el] };
    }
    const wrap = document.createElement("div");
    wrap.className = "calendar-day-header";
    const weekday = document.createElement("span");
    weekday.className = "calendar-day-header-weekday";
    weekday.textContent = letter;
    const date = document.createElement("span");
    date.className = "calendar-day-header-date";
    date.textContent = formatCalendarHeaderDate(arg.date, i18n.language);
    wrap.append(weekday, date);
    return { domNodes: [wrap] };
  }

  const taskEvents = useMemo(() => {
    return tasks.flatMap((task) => {
      if (task.scheduledStart && task.scheduledEnd) {
        return [
          taskToFullCalendar({
            id: task.id,
            title: task.title,
            projectId: task.projectId,
            date: toCalendarDateString(new Date(task.scheduledStart)),
            scheduledStart: task.scheduledStart,
            scheduledEnd: task.scheduledEnd,
          }),
        ];
      }
      const parsed = parseDueValue(task.due);
      if (!parsed) return [];
      return [
        taskToFullCalendar({
          id: task.id,
          title: task.title,
          projectId: task.projectId,
          date: toCalendarDateString(parsed),
          time: task.dueTime,
        }),
      ];
    });
  }, [tasks]);

  const fcEvents = useMemo(() => {
    const native = events.filter((event) => isCalendarEventVisible(event, displayOptions)).map((event) =>
      calendarEventToFullCalendar(
        event,
        accountColorVar(event.accountEmail, accountColorMap),
      ),
    );
    const visibleOverlays = overlays
      .filter((overlay) => isCalendarOverlayVisible(overlay, displayOptions))
      .map(overlayToFullCalendar);
    const visibleTasks = displayOptions.tasks ? taskEvents : [];
    return [...native, ...visibleOverlays, ...visibleTasks];
  }, [events, overlays, taskEvents, accountColorMap, displayOptions]);

  const eventsById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  );

  function handleDatesSet(arg: {
    start: Date;
    end: Date;
    view: { type: string; currentStart: Date };
  }) {
    const view = resolveCalendarView(
      arg.view.type,
      window.matchMedia("(max-width: 639px)").matches,
    );
    setActiveDate(arg.view.currentStart);
    setCurrentView(view);
    try {
      localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, view);
    } catch {
      // The calendar still works when storage is unavailable.
    }
    onRangeChange({
      start: arg.start.toISOString(),
      end: arg.end.toISOString(),
    });
  }

  function getCalendarApi() {
    return calendarRef.current?.getApi();
  }

  function handlePickDate(date: Date) {
    getCalendarApi()?.gotoDate(date);
  }

  function resolveEventTarget(fcEvent: EventApi): CalendarItemTarget | null {
    const props = fcEvent.extendedProps as Omit<CalendarOverlay, "kind"> & {
      kind?: string;
      taskId?: string;
      source?: string;
      masterId?: string;
    };
    if (props?.kind === "task") {
      if (!props.taskId || !props.projectId) return null;
      return { type: "task", taskId: props.taskId, projectId: props.projectId };
    }
    if (props?.kind === "milestone" || props?.kind === "document") {
      return {
        type: "overlay",
        overlay: {
          id: props.id,
          kind: props.kind,
          title: fcEvent.title,
          date: fcEvent.startStr.slice(0, 10),
          projectId: props.projectId ?? null,
          documentId: props.documentId ?? null,
          documentType: props.documentType ?? null,
          documentStatus: props.documentStatus ?? null,
          documentDateKind: props.documentDateKind ?? null,
          urgency: props.urgency ?? null,
        },
      };
    }
    const masterId = props?.masterId ?? fcEvent.groupId ?? fcEvent.id;
    // Detached instances carry the series id as masterId — resolve the row itself first.
    const event = eventsById.get(fcEvent.id) ?? eventsById.get(masterId);
    if (!event) return null;
    const instanceStart = instanceStartFromEvent({
      allDay: fcEvent.allDay,
      start: fcEvent.start,
    });
    return {
      type: "event",
      event,
      instanceStart: instanceStart ?? undefined,
    };
  }

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".fc-event")) return;
    const defaults = calendarDefaultsFromPointer(event.target);
    if (!defaults) return;

    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        {
          key: "add-event",
          label: t("contextMenu.addEvent"),
          icon: Plus,
          onSelect: () => onCreate(defaults),
        },
      ],
    });
  }

  function openEventContextMenu(x: number, y: number, fcEvent: EventApi) {
    const target = resolveEventTarget(fcEvent);
    if (!target) return;

    let items: CalendarContextMenuItem[] = [];
    if (target.type === "task") {
      items = [
        {
          key: "open-task",
          label: t("contextMenu.openTask"),
          icon: ArrowUpRight,
          onSelect: () => onSelectTask?.(target.taskId, target.projectId),
        },
        {
          key: "clear-due",
          label: t("contextMenu.clearDue"),
          icon: X,
          onSelect: () => onClearTaskDue?.(target.taskId, target.projectId),
        },
      ];
    } else if (target.type === "overlay") {
      items = [
        {
          key: "view",
          label: t("contextMenu.viewDetails"),
          icon: Eye,
          onSelect: () => onSelectOverlay(target.overlay),
        },
      ];
    } else {
      items = [
        {
          key: "view",
          label: t("contextMenu.viewDetails"),
          icon: Eye,
          onSelect: () => onSelectEvent(target.event, target.instanceStart),
        },
        {
          key: "edit",
          label: t("detail.edit"),
          icon: Pencil,
          onSelect: () => onEditEvent?.(target.event, target.instanceStart),
        },
        {
          key: "delete",
          label: t("form.delete"),
          icon: Trash2,
          danger: true,
          onSelect: () => onDeleteEvent?.(target.event, target.instanceStart),
        },
      ];
    }
    setContextMenu({ x, y, items });
  }

  // eventDidMount listeners attach once per event element; route through a ref
  // so they always see the latest props/events instead of a stale closure.
  const openEventContextMenuRef = useRef(openEventContextMenu);
  openEventContextMenuRef.current = openEventContextMenu;

  function handleEventDidMount(arg: EventMountArg) {
    arg.el.title = arg.event.title;
    arg.el.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openEventContextMenuRef.current(ev.clientX, ev.clientY, arg.event);
    });
  }

  function handleEventClick(arg: EventClickArg) {
    const target = resolveEventTarget(arg.event);
    if (!target) return;
    if (target.type === "task") {
      onSelectTask?.(target.taskId, target.projectId);
    } else if (target.type === "overlay") {
      onSelectOverlay(target.overlay);
    } else {
      onSelectEvent(target.event, target.instanceStart);
    }
  }

  async function handleEventDrop(arg: EventDropArg) {
    const props = arg.event.extendedProps as {
      kind?: string;
      source?: string;
      scheduled?: boolean;
      taskId?: string;
      projectId?: string;
    };
    if (props?.kind === "task") {
      if (props.taskId && props.projectId && arg.event.start) {
        if (props.scheduled && arg.event.end) {
          if (!onTaskSchedule) {
            arg.revert();
            return;
          }
          try {
            await onTaskSchedule(
              props.taskId,
              props.projectId,
              arg.event.start,
              arg.event.end,
            );
          } catch {
            arg.revert();
          }
          return;
        }
        if (arg.view.type.startsWith("timeGrid") && !arg.event.allDay && arg.event.end) {
          if (!onTaskSchedule) {
            arg.revert();
            return;
          }
          try {
            await onTaskSchedule(
              props.taskId,
              props.projectId,
              arg.event.start,
              arg.event.end,
            );
          } catch {
            arg.revert();
          }
          return;
        }
        const applied = await onTaskDrop?.(
          props.taskId,
          props.projectId,
          arg.event.start,
        );
        if (!applied) arg.revert();
      } else {
        arg.revert();
      }
      return;
    }
    if (props?.kind || props?.source === "google") {
      arg.revert();
      return;
    }
    const patch = fullCalendarDropToPatch(arg);
    if (Object.keys(patch).length === 0) {
      arg.revert();
      return;
    }
    try {
      await onMove(arg.event.id, patch);
    } catch {
      arg.revert();
    }
  }

  async function handleEventResize(arg: {
    event: EventApi;
    revert: () => void;
  }) {
    await applyCalendarEventResize(arg, onMove, onTaskSchedule)
  }

  function handleExternalDrop(arg: DropArg) {
    const taskId = arg.draggedEl.dataset.taskId;
    const projectId = arg.draggedEl.dataset.projectId;
    if (!taskId || !projectId) return;
    void onTaskDrop?.(taskId, projectId, arg.date);
  }

  return (
    <div
      className="calendar-shell flex min-h-0 flex-1 flex-col overflow-hidden"
      data-loading={isLoading ? "true" : undefined}
      onContextMenu={handleContextMenu}
    >
      <CalendarToolbar
        activeDate={activeDate}
        currentView={currentView}
        onPrev={() => getCalendarApi()?.prev()}
        onNext={() => getCalendarApi()?.next()}
        onToday={() => getCalendarApi()?.today()}
        onChangeView={(view) => getCalendarApi()?.changeView(view)}
        onPickDate={handlePickDate}
        onCreate={() => onCreate({})}
        accountColorMap={accountColorMap}
        todoPanelOpen={todoPanelOpen}
        onTodoPanelOpenChange={onTodoPanelOpenChange}
        showAllWork={showAllWork}
        onShowAllWorkChange={setShowAllWork}
        displayOptions={displayOptions}
        onToggleDisplayOption={toggleDisplayOption}
      />

      <div className="flex min-h-0 flex-1">
        <div ref={calendarBoxRef} className="min-h-0 min-w-0 flex-1">
          <FullCalendar
            ref={calendarRef}
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
              rrulePlugin,
            ]}
            locale={i18n.language === "th" ? thLocale : "en"}
            initialView={currentView}
            headerToolbar={false}
            height="100%"
            expandRows
            editable
            eventStartEditable
            eventDurationEditable
            dayMaxEvents
            nowIndicator
            droppable={taskDropEnabled}
            dayHeaderContent={renderDayHeader}
            events={fcEvents}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventContent={calendarEventContent}
            eventDidMount={handleEventDidMount}
            drop={handleExternalDrop}
          />
        </div>

        <AnimatePresence initial={false}>
          {todoPanelOpen && (
            <>
              <motion.button
                key="todo-backdrop"
                type="button"
                aria-label={t("detail.close")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onTodoPanelOpenChange?.(false)}
                className="fixed inset-0 z-20 bg-surface-overlay/45 backdrop-blur-[2px] xl:hidden"
              />
              <motion.div
                key="todo-panel"
                ref={todoPanelRef}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: motionEase }}
                className="fixed inset-y-0 right-0 z-30 min-h-0 max-w-[calc(100vw-3rem)] shrink-0 overflow-hidden border-l border-border-subtle bg-card shadow-modal xl:relative xl:inset-auto xl:z-auto xl:shadow-none"
              >
                <div className="flex h-14 items-center justify-between border-b border-border-subtle px-3 xl:hidden">
                  <span className="text-sm font-medium text-foreground">
                    {t("toolbar.todo")}
                  </span>
                  <button
                    type="button"
                    onClick={() => onTodoPanelOpenChange?.(false)}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground active:bg-surface-raised active:text-foreground"
                    aria-label={t("detail.close")}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="h-[calc(100%-3.5rem)] w-[280px] max-w-full xl:h-full">
                  <TodoPanel showAllProjects={showAllWork} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <CalendarContextMenu
        open={!!contextMenu}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        items={contextMenu?.items ?? []}
        onClose={() => setContextMenu(null)}
      />

      <style>{`
        body > [data-task-id] {
          transition: none !important;
          transform: rotate(1.5deg) scale(1.02);
          box-shadow: var(--shadow-modal);
          pointer-events: none;
        }
        .calendar-shell .fc {
          --fc-border-color: var(--border-subtle);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: var(--surface-raised);
          --fc-list-event-hover-bg-color: var(--primary-soft);
          --fc-today-bg-color: color-mix(in srgb, var(--warning) 10%, transparent);
          --fc-event-bg-color: var(--primary);
          --fc-event-border-color: var(--primary-border);
          --fc-event-text-color: var(--primary-foreground);
          --fc-small-font-size: 0.8125rem;
          font-family: inherit;
          font-size: 0.875rem;
        }
        .calendar-shell .fc .fc-col-header-cell-cushion,
        .calendar-shell .fc .fc-daygrid-day-number,
        .calendar-shell .fc .fc-list-day-cushion,
        .calendar-shell .fc .fc-list-event-time,
        .calendar-shell .fc .fc-list-event-title {
          color: var(--foreground);
          text-decoration: none;
          font-size: 0.8125rem;
        }
        .calendar-shell .fc .fc-col-header-cell-cushion {
          font-weight: 500;
          padding: 0.375rem 0;
        }
        .calendar-shell .fc .calendar-day-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
          line-height: 1.15;
          padding: 0.125rem 0;
        }
        .calendar-shell .fc .calendar-day-header-weekday {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--foreground);
        }
        .calendar-shell .fc .calendar-day-header-date {
          font-size: 0.6875rem;
          font-weight: 500;
          color: var(--muted-foreground);
        }
        .calendar-shell .fc .fc-daygrid-day-number {
          padding: 0.5rem 0.625rem;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .calendar-shell .fc,
        .calendar-shell .fc .fc-view-harness {
          height: 100%;
          min-height: 0;
        }
        /* Every week keeps the same floor height; without it FullCalendar sizes
           each row to its own event count and cells visibly shrink as the month
           grid scrolls. */
        .calendar-shell .fc .fc-dayGridMonth-view .fc-daygrid-day-frame {
          min-height: 5.5rem;
        }
        .calendar-shell .fc .fc-daygrid-body,
        .calendar-shell .fc .fc-scrollgrid,
        .calendar-shell .fc .fc-timegrid-body,
        .calendar-shell .fc .fc-list {
          border-color: var(--border-subtle);
        }
        .calendar-shell .fc .fc-day-other .fc-daygrid-day-number {
          color: var(--muted-foreground);
          opacity: 0.55;
        }
        .calendar-shell .fc .fc-event {
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.125rem 0.375rem;
          border-width: 1px;
          border-style: solid;
        }
        @media (max-width: 1023px) {
          .calendar-shell .fc .fc-col-header-cell-cushion {
            padding: 0.25rem 0;
          }
          .calendar-shell .fc .calendar-day-header-weekday {
            font-size: 0.6875rem;
          }
          .calendar-shell .fc .calendar-day-header-date {
            font-size: 0.625rem;
          }
          .calendar-shell .fc .fc-daygrid-day-number {
            padding: 0.25rem 0.375rem;
            font-size: 0.75rem;
          }
          .calendar-shell .fc .fc-dayGridMonth-view .fc-daygrid-day-frame {
            min-height: 3.25rem;
          }
          .calendar-shell .fc .fc-daygrid-day-events {
            margin-top: 0.125rem;
          }
          .calendar-shell .fc .fc-daygrid-event-harness {
            margin-top: 1px;
          }
          .calendar-shell .fc .fc-daygrid-event {
            border-radius: 0.25rem;
            font-size: 0.625rem;
            font-weight: 600;
            line-height: 1.15;
            padding: 0.0625rem 0.25rem;
            margin: 0 1px 1px;
          }
          .calendar-shell .fc .fc-daygrid-more-link {
            font-size: 0.625rem;
            font-weight: 600;
            padding: 0 0.25rem;
            color: var(--muted-foreground);
          }
          .calendar-shell .fc .calendar-event-row {
            gap: 0.125rem;
          }
          .calendar-shell .fc .calendar-event-row-time {
            display: none;
          }
        }
        .calendar-shell .fc .calendar-event-row {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          min-width: 0;
          width: 100%;
        }
        .calendar-shell .fc .calendar-event-row-title {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .calendar-shell .fc .fc-daygrid-event-harness {
          overflow: hidden;
        }
        .calendar-shell .fc .fc-event-title,
        .calendar-shell .fc .fc-event-title-container {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .calendar-shell .fc .calendar-event-row-time {
          flex-shrink: 0;
          font-size: 0.6875rem;
          font-weight: 400;
          opacity: 0.72;
          font-variant-numeric: tabular-nums;
        }
        .calendar-shell .fc .calendar-event-native,
        .calendar-shell .fc .calendar-event-native .fc-event-main {
          background: color-mix(in srgb, var(--primary) 88%, black);
          border-color: var(--primary-border);
          color: var(--primary-foreground);
        }
        .calendar-shell .fc .calendar-event-google,
        .calendar-shell .fc .calendar-event-google .fc-event-main {
          background: color-mix(in srgb, var(--info) 18%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--info) 45%, var(--border-subtle));
          color: var(--info);
        }
        .calendar-legend-native {
          background: color-mix(in srgb, var(--primary) 88%, black);
          border-color: var(--primary-border);
        }
        .calendar-legend-task {
          background: color-mix(in srgb, var(--success) 22%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--success) 55%, var(--border-subtle));
        }
        .calendar-legend-google {
          background: color-mix(in srgb, var(--info) 18%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--info) 45%, var(--border-subtle));
        }
        .calendar-legend-milestone {
          background: color-mix(in srgb, var(--category-orange) 22%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--category-orange) 55%, var(--border-subtle));
          border-style: dashed;
        }
        .calendar-legend-document {
          background: color-mix(in srgb, var(--category-purple) 22%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--category-purple) 55%, var(--border-subtle));
          border-style: dashed;
        }
        .calendar-legend-document-soon {
          background: color-mix(in srgb, var(--warning) 22%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--warning) 58%, var(--border-subtle));
          border-style: dashed;
        }
        .calendar-legend-document-critical {
          background: color-mix(in srgb, var(--danger) 24%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--danger) 66%, var(--border-subtle));
          border-style: dashed;
        }
        .calendar-legend-document-recurring {
          background: color-mix(in srgb, var(--info) 16%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--info) 42%, var(--border-subtle));
          border-style: dashed;
        }
        .calendar-shell .fc .calendar-overlay-milestone,
        .calendar-shell .fc .calendar-overlay-milestone .fc-event-main {
          background: color-mix(in srgb, var(--category-orange) 22%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--category-orange) 55%, var(--border-subtle));
          border-style: dashed;
          color: var(--category-orange);
        }
        .calendar-shell .fc .calendar-overlay-document,
        .calendar-shell .fc .calendar-overlay-document .fc-event-main {
          background: color-mix(in srgb, var(--category-purple) 22%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--category-purple) 55%, var(--border-subtle));
          border-style: dashed;
          color: var(--category-purple);
        }
        .calendar-shell .fc .calendar-overlay-document-soon,
        .calendar-shell .fc .calendar-overlay-document-soon .fc-event-main {
          background: color-mix(in srgb, var(--warning) 22%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--warning) 58%, var(--border-subtle));
          color: var(--warning);
        }
        .calendar-shell .fc .calendar-overlay-document-critical,
        .calendar-shell .fc .calendar-overlay-document-critical .fc-event-main {
          background: color-mix(in srgb, var(--danger) 24%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--danger) 66%, var(--border-subtle));
          color: var(--danger);
        }
        .calendar-shell .fc .calendar-overlay-document-recurring,
        .calendar-shell .fc .calendar-overlay-document-recurring .fc-event-main {
          background: color-mix(in srgb, var(--info) 16%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--info) 42%, var(--border-subtle));
          color: var(--info);
        }
        .calendar-shell .fc .calendar-overlay-task,
        .calendar-shell .fc .calendar-overlay-task .fc-event-main {
          background: color-mix(in srgb, var(--success) 22%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--success) 55%, var(--border-subtle));
          border-style: solid;
          color: var(--success);
        }
        .calendar-shell .fc .fc-popover {
          background: var(--surface-overlay);
          border: 1px solid var(--border-subtle);
          border-radius: 0.75rem;
          box-shadow: 0 12px 40px rgb(0 0 0 / 0.35);
          z-index: 90;
          overflow: hidden;
        }
        .calendar-shell .fc .fc-popover-header {
          background: var(--surface-raised);
          color: var(--foreground);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .calendar-shell .fc .fc-popover-body {
          background: var(--surface-overlay);
          max-height: min(18rem, 70vh);
          overflow-y: auto;
          padding: 0.375rem;
        }
        .calendar-shell .fc .fc-popover .fc-daygrid-day-events {
          position: static !important;
          margin: 0 !important;
        }
        .calendar-shell .fc .fc-popover .fc-daygrid-event-harness {
          position: static !important;
          inset: auto !important;
          margin: 0 0 0.25rem;
        }
        .calendar-shell .fc .fc-popover .fc-event {
          position: relative !important;
        }
        .calendar-shell .fc .fc-popover .calendar-event-native,
        .calendar-shell .fc .fc-popover .calendar-event-native .fc-event-main,
        .calendar-shell .fc .fc-popover .calendar-event-google,
        .calendar-shell .fc .fc-popover .calendar-event-google .fc-event-main,
        .calendar-shell .fc .fc-popover .calendar-overlay-milestone,
        .calendar-shell .fc .fc-popover .calendar-overlay-milestone .fc-event-main,
        .calendar-shell .fc .fc-popover .calendar-overlay-document,
        .calendar-shell .fc .fc-popover .calendar-overlay-document .fc-event-main,
        .calendar-shell .fc .fc-popover .calendar-overlay-document-soon,
        .calendar-shell .fc .fc-popover .calendar-overlay-document-soon .fc-event-main,
        .calendar-shell .fc .fc-popover .calendar-overlay-document-critical,
        .calendar-shell .fc .fc-popover .calendar-overlay-document-critical .fc-event-main,
        .calendar-shell .fc .fc-popover .calendar-overlay-document-recurring,
        .calendar-shell .fc .fc-popover .calendar-overlay-document-recurring .fc-event-main,
        .calendar-shell .fc .fc-popover .calendar-overlay-task,
        .calendar-shell .fc .fc-popover .calendar-overlay-task .fc-event-main {
          background: var(--surface-raised);
        }
        .calendar-shell .fc .fc-timegrid-slot-label-cushion {
          color: var(--muted-foreground);
          font-size: 0.75rem;
        }
        .calendar-shell[data-loading='true'] {
          opacity: 0.6;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
