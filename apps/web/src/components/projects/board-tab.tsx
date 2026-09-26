// Board tab — kanban with drag-and-drop, task detail sheet, create dialog, context menu
import { MilestoneDiamond } from "@/components/icons/milestone-diamond";
import { CreateTaskDialog } from "@/components/projects/create-task-dialog";
import { FilterBar } from "@/components/projects/filter-bar";
import { IssuesViewSwitcher } from "@/components/projects/issues-view-switcher";
import { LabelChip } from "@/components/projects/label-chip";
import { milestoneDiamondClass } from "@/components/projects/milestone-styles";
import { getTaskStatusFilterConfig } from "@/components/projects/status-styles";
import { TaskContextMenu } from "@/components/projects/task-context-menu";
import { TaskDeleteConfirmDialog } from "@/components/projects/task-delete-confirm-dialog";
import type { TaskFilter } from "@/components/projects/task-filter-matching";
import {
  isFilterActive,
  taskMatchesFilter,
} from "@/components/projects/task-filter-matching";
import { TaskStatusHeader } from "@/components/projects/task-status-header";
import {
  InlineDueCompact,
  InlinePriorityIcon,
  TaskCreatedLine,
} from "@/components/projects/task-table-inline-cells";
import type {
  Milestone,
  Project,
  Status,
  Task,
} from "@/components/projects/types";
import { AiBadge } from "@/components/ui/ai-badge";
import { Button } from "@/components/ui/button";
import { Plus } from "@/components/icons";
import {
  coordinateGetter,
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { useProjects } from "@/context/projects";
import { useMilestones } from "@/hooks/use-milestones";
import type { ApiTaskCreateBody } from "@/lib/api-types";
import { motionEase, panelFadeUp } from "@/lib/motion";
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const COLLAPSED_KEY = "fos-collapsed-cols";

interface TaskCardProps {
  task: Task;
  milestone?: Milestone;
  done?: boolean;
  isOverlay?: boolean;
  onOpen?: (taskId: string) => void;
  onUpdateTask: (
    taskId: string,
    patch: Partial<Task> & { labelIds?: string[] },
  ) => void;
}

const TaskCard = memo(function TaskCard({
  task,
  milestone,
  done,
  isOverlay,
  onOpen,
  onUpdateTask,
}: TaskCardProps) {
  const { t } = useTranslation("projects");
  return (
    <div
      onClick={onOpen ? () => onOpen(task.id) : undefined}
      className="surface-card cursor-default rounded-xl px-3 py-2.5 transition-colors duration-base"
      style={{
        opacity: done ? 0.5 : 1,
        boxShadow: isOverlay ? "var(--shadow-modal)" : "none",
        transform: isOverlay ? "rotate(1.5deg) scale(1.02)" : "none",
      }}
    >
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <p className="hidden text-2xs font-medium text-muted-foreground/80 xl:block">
          {task.displayId}
        </p>
        {task.aiAssigned && (
          <AiBadge label={t("board.ai")} className="h-4 py-0 xl:ml-0 ml-auto" />
        )}
      </div>

      <p
        className="text-sm font-medium leading-snug text-foreground"
        style={done ? { textDecoration: "line-through", opacity: 0.5 } : {}}
      >
        {task.title}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <InlinePriorityIcon
          variant="card"
          task={task}
          onSelect={(priority) => onUpdateTask(task.id, { priority })}
        />
        <span className="hidden xl:contents">
          <InlineDueCompact
            variant="card"
            task={task}
            onSave={(due) => onUpdateTask(task.id, { due })}
          />
        </span>
        {milestone && (
          <span title={milestone.name}>
            <MilestoneDiamond
              size={12}
              strokeWidth={2}
              className={milestoneDiamondClass(milestone)}
            />
          </span>
        )}
        {task.labels.map((label) => (
          <LabelChip key={label.id} label={label} size="sm" />
        ))}
      </div>

      <div className="hidden xl:block">
        <TaskCreatedLine createdAt={task.createdAt} />
      </div>
    </div>
  );
});

export function BoardTab({
  project,
  filter,
  onFilterChange,
  onViewChange,
}: {
  project: Project;
  filter: TaskFilter;
  onFilterChange: (f: TaskFilter) => void;
  onViewChange: (view: "board" | "table") => void;
}) {
  const { t } = useTranslation("projects");
  const statusLabels = useMemo(
    () =>
      Object.fromEntries(
        getTaskStatusFilterConfig(t).map((s) => [s.value, s.label]),
      ),
    [t],
  );
  const {
    projects,
    createTask: apiCreateTask,
    updateTask: apiUpdateTask,
    deleteTask: apiDeleteTask,
    duplicateTask: apiDuplicateTask,
    reorderColumns,
  } = useProjects();
  const navigate = useNavigate();
  const { milestones } = useMilestones(project.id);
  const milestoneById = useMemo(
    () => new Map(milestones.map((m) => [m.id, m])),
    [milestones],
  );

  // Distance constraint: drag activates only after 5px of movement,
  // so a plain click still fires onClick on the card.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  );
  const [createForColumn, setCreateForColumn] = useState<Status | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Collapsed columns — persisted to localStorage
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore parse errors */
    }
    return new Set<string>();
  });

  const toggleCollapsed = useCallback((colId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // columns array → Record<colId, Task[]>
  const columnsMap = useMemo<Record<string, Task[]>>(
    () => Object.fromEntries(project.columns.map((col) => [col.id, col.tasks])),
    [project.columns],
  );

  // Find task across all columns
  const findTask = useCallback(
    (id: string): { task: Task; columnId: string } | undefined => {
      for (const col of project.columns) {
        const task = col.tasks.find((t) => t.id === id);
        if (task) return { task, columnId: col.id };
      }
    },
    [project.columns],
  );

  const updateTask = useCallback(
    (taskId: string, patch: Partial<Task> & { labelIds?: string[] }) => {
      apiUpdateTask(taskId, project.id, patch);
    },
    [project.id, apiUpdateTask],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      apiDeleteTask(taskId, project.id);
    },
    [project.id, apiDeleteTask],
  );

  const createTask = useCallback(
    (columnId: Status, task: ApiTaskCreateBody) => {
      apiCreateTask(project.id, columnId, task);
    },
    [project.id, apiCreateTask],
  );

  const duplicateTask = useCallback(
    (taskId: string) => {
      apiDuplicateTask(taskId, project.id);
    },
    [project.id, apiDuplicateTask],
  );

  const openTask = useCallback(
    (taskId: string) => {
      navigate({
        to: "/projects/$projectId/issues/$taskId",
        params: { projectId: project.id, taskId },
        search: {
          statuses: [],
          priorities: [],
          tags: [],
          due: null,
          created: null,
          milestone: null,
        },
      });
    },
    [navigate, project.id],
  );

  const handleMoveTask = useCallback(
    async (taskId: string, targetProjectId: string) => {
      const found = findTask(taskId);
      if (!found) return;
      await apiCreateTask(targetProjectId, found.task.status as Status, {
        title: found.task.title,
        priority: found.task.priority,
        due: found.task.due,
        labelIds: found.task.labels.map((l) => l.id),
        description: found.task.description,
        aiAssigned: false,
      });
      await apiDeleteTask(taskId, project.id);
    },
    [findTask, apiCreateTask, apiDeleteTask, project.id],
  );

  const handleValueChange = useCallback(
    (updated: Record<UniqueIdentifier, Task[]>) => {
      reorderColumns(project.id, updated);
    },
    [project.id, reorderColumns],
  );

  // Non-collapsed columns count for grid
  const visibleColumnCount = project.columns.filter(
    (c) => !collapsed.has(c.id),
  ).length;
  const collapsedCount = project.columns.length - visibleColumnCount;

  const boardOtherProjects = useMemo(
    () =>
      projects
        .filter((p) => p.id !== project.id)
        .map((p) => ({ id: p.id, name: p.name })),
    [projects, project.id],
  );

  return (
    <motion.div key="board" {...panelFadeUp}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 xl:mb-5">
        <div className="min-w-0 flex-1">
          <FilterBar filter={filter} onChange={onFilterChange} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateForColumn("todo")}
          >
            <Plus size={14} strokeWidth={2} />
            {t("board.addTask")}
          </Button>
          <IssuesViewSwitcher current="board" onViewChange={onViewChange} />
        </div>
      </div>

      <Kanban
        value={columnsMap}
        onValueChange={handleValueChange}
        getItemValue={(t) => t.id}
        flatCursor
        sensors={sensors}
      >
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <KanbanBoard
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
              minWidth: "min-content",
            }}
          >
            {project.columns.map((col) => {
              const isCollapsed = collapsed.has(col.id);
              const taskCount = (columnsMap[col.id] ?? []).length;

              if (isCollapsed) {
                return (
                  <motion.div
                    key={col.id}
                    layout
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 40, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: motionEase }}
                    className="shrink-0 flex flex-col items-center py-3 rounded-xl cursor-pointer select-none surface-card"
                    style={{ width: 40, minHeight: 120 }}
                    onClick={() => toggleCollapsed(col.id)}
                    title={t("board.expandColumn", {
                      label: statusLabels[col.id],
                    })}
                  >
                    <span className="mb-2 text-xs font-medium tabular-nums text-muted-foreground">
                      {taskCount}
                    </span>
                    <span
                      className="text-xs font-medium text-foreground"
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                        transform: "rotate(180deg)",
                      }}
                    >
                      {statusLabels[col.id]}
                    </span>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={col.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    flex: `1 1 ${Math.floor(100 / Math.max(visibleColumnCount + collapsedCount, 1))}%`,
                    minWidth: 232,
                  }}
                >
                  <KanbanColumn
                    value={col.id}
                    className="!bg-transparent !border-0 !rounded-none !p-0 !gap-0"
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <TaskStatusHeader
                        status={col.id as Status}
                        label={statusLabels[col.id]}
                        color={
                          getTaskStatusFilterConfig(t).find(
                            (s) => s.value === col.id,
                          )?.color ?? "var(--text-muted)"
                        }
                        count={
                          isFilterActive(filter)
                            ? `${(columnsMap[col.id] ?? []).filter((task) => taskMatchesFilter(task, filter)).length}/${(columnsMap[col.id] ?? []).length}`
                            : (columnsMap[col.id] ?? []).length
                        }
                        onToggle={() => toggleCollapsed(col.id)}
                        onAdd={() => setCreateForColumn(col.id as Status)}
                      />
                    </div>

                    <div className="space-y-2">
                      {(columnsMap[col.id] ?? []).map((task) => {
                        const matches = taskMatchesFilter(task, filter);
                        return (
                          <div
                            key={task.id}
                            style={{
                              opacity: matches ? 1 : 0.25,
                              transition: "opacity 0.15s",
                              pointerEvents: matches ? undefined : "none",
                            }}
                          >
                            <TaskContextMenu
                              task={task}
                              projectId={project.id}
                              otherProjects={boardOtherProjects}
                              onUpdateTask={updateTask}
                              onDeleteTask={setPendingDeleteId}
                              onDuplicateTask={duplicateTask}
                              onMoveTask={handleMoveTask}
                            >
                              <KanbanItem
                                value={task.id}
                                asHandle
                                className="rounded-xl data-dragging:cursor-grabbing"
                              >
                                <TaskCard
                                  task={task}
                                  milestone={
                                    task.milestoneId
                                      ? milestoneById.get(task.milestoneId)
                                      : undefined
                                  }
                                  done={col.id === "done"}
                                  onUpdateTask={updateTask}
                                  onOpen={openTask}
                                />
                              </KanbanItem>
                            </TaskContextMenu>
                          </div>
                        );
                      })}

                      {(columnsMap[col.id] ?? []).length === 0 && (
                        <div className="rounded-xl px-3 py-5 flex items-center justify-center text-sm font-medium text-muted-foreground border border-dashed border-border">
                          {t("board.empty")}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setCreateForColumn(col.id as Status)}
                        className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all border border-dashed border-border"
                      >
                        {t("board.addTaskInline")}
                      </button>
                    </div>
                  </KanbanColumn>
                </motion.div>
              );
            })}
          </KanbanBoard>
        </div>

        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant !== "item") return null;
            const result = findTask(value as string);
            if (!result) return null;
            return (
              <TaskCard
                task={result.task}
                milestone={
                  result.task.milestoneId
                    ? milestoneById.get(result.task.milestoneId)
                    : undefined
                }
                isOverlay
                onUpdateTask={updateTask}
              />
            );
          }}
        </KanbanOverlay>
      </Kanban>

      <AnimatePresence>
        {createForColumn && (
          <CreateTaskDialog
            key={createForColumn}
            defaultColumnId={createForColumn}
            onClose={() => setCreateForColumn(null)}
            onCreate={(colId, task) => createTask(colId, task)}
          />
        )}
      </AnimatePresence>

      <TaskDeleteConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        taskTitle={
          pendingDeleteId ? findTask(pendingDeleteId)?.task.title : undefined
        }
        onConfirm={() => {
          if (pendingDeleteId) deleteTask(pendingDeleteId);
        }}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-8 px-1">
        <span className="text-xs font-medium text-caption">
          {t("board.legend")}
        </span>
        {[
          ["var(--destructive)", t("board.legendHigh")],
          ["var(--accent)", t("board.legendMedium")],
          ["#7ef1c1", t("board.legendLow")],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: c }}
            />
            <span className="text-xs text-muted-foreground">{l}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-0 sm:ml-2">
          <AiBadge label={t("board.ai")} />
          <span className="text-xs text-caption">{t("board.aiAssigned")}</span>
        </div>
      </div>
    </motion.div>
  );
}
