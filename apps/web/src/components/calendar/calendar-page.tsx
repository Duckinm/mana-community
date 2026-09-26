import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarViewSkeleton } from "@/components/calendar/calendar-view-skeleton";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import type {
  CalendarDateRange,
  CalendarEvent,
  CalendarEventInput,
  CalendarOverlay,
  RecurrenceMutationOptions,
} from "@/components/calendar/types";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { parseCalendarDate } from "@/lib/calendar-date";
import { parseTimestamp } from "@/lib/timestamp";
import { useProjects } from "@/context/projects";
import { isActiveProject } from "@/lib/active-project";
import {
  formatDueLabel,
  formatTaskDueDisplay,
  isSameDueDay,
  parseDueValue,
} from "@/components/projects/due-helpers";
import { TaskRescheduleConfirmDialog } from "@/components/calendar/task-reschedule-confirm-dialog";
import { RecurrenceScopeDialog } from "@/components/calendar/recurrence-scope-dialog";
import type { Task } from "@/components/projects/types";

const TODO_PANEL_STORAGE_KEY = "calendar-todo-panel";

function eventStartDate(input: CalendarEventInput): Date | null {
  return input.allDay
    ? parseCalendarDate(input.startDate)
    : parseTimestamp(input.startAt);
}

function dueTimeFromDate(date: Date): string | null {
  if (date.getHours() === 0 && date.getMinutes() === 0) return null
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function taskSchedulePatch(start: Date, end: Date) {
  return {
    due: formatDueLabel(start),
    dueTime: dueTimeFromDate(start),
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
  }
}

export function CalendarPage() {
  const navigate = useNavigate();
  const { projects, updateTask } = useProjects();
  const [range, setRange] = useState<CalendarDateRange | null>(null);
  const [todoPanelOpen, setTodoPanelOpen] = useState(() => {
    try {
      return localStorage.getItem(TODO_PANEL_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [formOpen, setFormOpen] = useState(false);
  const [focusDate, setFocusDate] = useState<Date | null>(null);
  const [eventDetail, setEventDetail] = useState<{
    event: CalendarEvent;
    instanceStart?: string;
  } | null>(null);
  const [overlayDetail, setOverlayDetail] = useState<CalendarOverlay | null>(
    null,
  );
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [instanceStart, setInstanceStart] = useState<string | null>(null);
  const [createDefaults, setCreateDefaults] = useState<
    Partial<CalendarEventInput> | undefined
  >();

  const {
    events,
    overlays,
    isLoading,
    isError,
    refetch,
    isPending,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarEvents(range);

  function openCreate(defaults?: Partial<CalendarEventInput>) {
    setEditingEvent(null);
    setInstanceStart(null);
    setCreateDefaults(defaults);
    setFormOpen(true);
  }

  function openEdit(event: CalendarEvent, start?: string) {
    setEditingEvent(event);
    setInstanceStart(start ?? null);
    setCreateDefaults(undefined);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingEvent(null);
    setInstanceStart(null);
    setCreateDefaults(undefined);
  }

  const calendarTasks = useMemo(
    () =>
      projects.filter(isActiveProject).flatMap((project) =>
        project.columns.flatMap((column) =>
          column.tasks
            .filter(
              (task) => task.status === "todo" || task.status === "in-progress",
            )
            .map((task) => ({ ...task, projectId: project.id })),
        ),
      ),
    [projects],
  );

  const [pendingTaskDrop, setPendingTaskDrop] = useState<{
    task: Task;
    projectId: string;
    date: Date;
    resolve: (applied: boolean) => void;
  } | null>(null);

  const tasksById = useMemo(
    () => new Map(calendarTasks.map((task) => [task.id, task])),
    [calendarTasks],
  );

  function applyTaskDrop(task: Task, projectId: string, date: Date) {
    const dueTime = dueTimeFromDate(date);
    void updateTask(task.id, projectId, {
      due: formatDueLabel(date),
      dueTime: dueTime ?? task.dueTime ?? null,
      ...(dueTime
        ? {
            scheduledStart: date.toISOString(),
            scheduledEnd: new Date(date.getTime() + 30 * 60 * 1000).toISOString(),
          }
        : {}),
    });
  }

  function handleTaskDrop(
    taskId: string,
    projectId: string,
    date: Date,
  ): Promise<boolean> {
    const task = tasksById.get(taskId);
    const currentDue = task ? parseDueValue(task.due) : undefined;
    const nextDueTime = dueTimeFromDate(date) ?? task?.dueTime ?? null;
    if (
      currentDue &&
      isSameDueDay(currentDue, date) &&
      task?.dueTime === nextDueTime &&
      !dueTimeFromDate(date)
    )
      return Promise.resolve(true);
    if (!task || !currentDue) {
      if (task) applyTaskDrop(task, projectId, date);
      return Promise.resolve(true);
    }
    if (isSameDueDay(currentDue, date)) {
      applyTaskDrop(task, projectId, date);
      return Promise.resolve(true);
    }
    return new Promise((resolve) =>
      setPendingTaskDrop({ task, projectId, date, resolve }),
    );
  }

  async function handleTaskSchedule(
    taskId: string,
    projectId: string,
    start: Date,
    end: Date,
  ) {
    await updateTask(taskId, projectId, taskSchedulePatch(start, end));
  }

  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{
    event: CalendarEvent;
    instanceStart?: string;
  } | null>(null);

  function handleDeleteEventRequest(
    event: CalendarEvent,
    instanceStart?: string,
  ) {
    const needsScope =
      !!event.rrule && !event.recurringEventId && !!instanceStart;
    if (needsScope) {
      setPendingDeleteEvent({ event, instanceStart });
      return;
    }
    void deleteEvent({ id: event.id });
  }

  function toggleTodoPanel(open: boolean) {
    setTodoPanelOpen(open);
    try {
      localStorage.setItem(TODO_PANEL_STORAGE_KEY, String(open));
    } catch {
      /* ignore */
    }
  }

  function handleOpenOverlay(overlay: CalendarOverlay) {
    if (overlay.documentId) {
      void navigate({
        to: "/documents/$documentId",
        params: { documentId: overlay.documentId },
      });
      return;
    }
    if (overlay.projectId) {
      void navigate({
        to: "/projects/$projectId",
        params: { projectId: overlay.projectId },
      });
    }
  }

  if (!range && isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[calc(3rem+1.5rem+env(safe-area-inset-top))] xl:pt-0">
        <CalendarViewSkeleton />
      </div>
    );
  }

  if (isError && range) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-12 pt-[calc(3rem+1.5rem+env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:py-16 xl:pt-12">
        <QueryErrorPanel onRetry={refetch} className="max-w-md w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[calc(3rem+1.5rem+env(safe-area-inset-top))] xl:pt-0">
      <CalendarView
        events={events}
        overlays={overlays}
        isLoading={isLoading || isPending}
        focusDate={focusDate}
        onRangeChange={setRange}
        onCreate={openCreate}
        onSelectEvent={(event, start) =>
          setEventDetail({ event, instanceStart: start })
        }
        onSelectOverlay={setOverlayDetail}
        onMove={async (id, patch) => {
          await updateEvent({ id, patch });
        }}
        tasks={calendarTasks}
        todoPanelOpen={todoPanelOpen}
        onTodoPanelOpenChange={toggleTodoPanel}
        onTaskDrop={handleTaskDrop}
        onTaskSchedule={handleTaskSchedule}
        onSelectTask={(taskId, projectId) => {
          void navigate({
            to: "/projects/$projectId/issues/$taskId",
            params: { projectId, taskId },
            search: {
              statuses: [],
              priorities: [],
              tags: [],
              due: null,
              created: null,
              milestone: null,
            },
          });
        }}
        onEditEvent={openEdit}
        onDeleteEvent={handleDeleteEventRequest}
        onClearTaskDue={(taskId, projectId) => {
          void updateTask(taskId, projectId, { due: null });
        }}
      />

      <RecurrenceScopeDialog
        open={!!pendingDeleteEvent}
        mode="delete"
        onClose={() => setPendingDeleteEvent(null)}
        onSelect={(scope) => {
          if (!pendingDeleteEvent) return;
          void deleteEvent({
            id: pendingDeleteEvent.event.id,
            opts: { scope, instanceStart: pendingDeleteEvent.instanceStart },
          });
          setPendingDeleteEvent(null);
        }}
      />

      <TaskRescheduleConfirmDialog
        open={!!pendingTaskDrop}
        onOpenChange={(open) => {
          if (!open && pendingTaskDrop) {
            pendingTaskDrop.resolve(false);
            setPendingTaskDrop(null);
          }
        }}
        taskTitle={pendingTaskDrop?.task.title}
        currentDue={
          pendingTaskDrop ? formatTaskDueDisplay(pendingTaskDrop.task.due) : ""
        }
        newDue={
          pendingTaskDrop ? formatTaskDueDisplay(pendingTaskDrop.date) : ""
        }
        onConfirm={() => {
          if (!pendingTaskDrop) return;
          applyTaskDrop(
            pendingTaskDrop.task,
            pendingTaskDrop.projectId,
            pendingTaskDrop.date,
          );
          pendingTaskDrop.resolve(true);
          setPendingTaskDrop(null);
        }}
      />

      <EventDetailDialog
        eventDetail={eventDetail}
        overlayDetail={overlayDetail}
        isPending={isPending}
        onClose={() => {
          setEventDetail(null);
          setOverlayDetail(null);
        }}
        onEdit={openEdit}
        onDelete={async (event, opts) => {
          await deleteEvent({ id: event.id, opts });
        }}
        onOpenOverlay={handleOpenOverlay}
      />

      <EventFormDialog
        key={`${editingEvent?.id ?? "new"}-${instanceStart ?? ""}`}
        open={formOpen}
        event={editingEvent}
        instanceStart={instanceStart}
        defaults={createDefaults}
        dayEvents={events}
        isPending={isPending}
        onClose={closeForm}
        onSave={async (input, opts?: RecurrenceMutationOptions) => {
          if (editingEvent) {
            await updateEvent({ id: editingEvent.id, patch: input, opts });
          } else {
            await createEvent(input);
            setFocusDate(eventStartDate(input));
          }
        }}
      />
    </div>
  );
}
