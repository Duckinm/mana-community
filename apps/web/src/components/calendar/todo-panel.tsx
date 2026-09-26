import { TodoPanelSkeleton } from "@/components/calendar/todo-panel-skeleton";
import { Plus } from "@/components/icons";
import { CreateTaskDialog } from "@/components/projects/create-task-dialog";
import { LabelChip } from "@/components/projects/label-chip";
import {
  getTaskStatusFilterConfig,
  TASK_STATUS_ICON,
} from "@/components/projects/status-styles";
import {
  InlineDueCompact,
  InlinePriorityIcon,
  TaskCreatedLine,
} from "@/components/projects/task-table-inline-cells";
import type { Status, Task } from "@/components/projects/types";
import { AiBadge } from "@/components/ui/ai-badge";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/context/projects";
import { resolveActiveProject, useActiveProjectId } from "@/lib/active-project";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const PANEL_STATUSES: Status[] = ["todo", "in-progress"];

function TodoTaskCard({
  task,
  projectId,
  onOpen,
  onUpdateTask,
}: {
  task: Task;
  projectId: string;
  onOpen: () => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
}) {
  const { t: tProjects } = useTranslation("projects");
  return (
    <div
      data-task-id={task.id}
      data-project-id={projectId}
      onClick={onOpen}
      className="surface-card cursor-default rounded-xl px-3 py-2.5 transition-colors duration-base xl:active:cursor-grabbing"
    >
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <p className="text-2xs font-medium text-muted-foreground/80">
          {task.displayId}
        </p>
        {task.aiAssigned && (
          <AiBadge label={tProjects("board.ai")} className="h-4 py-0" />
        )}
      </div>
      <p className="text-sm font-medium leading-snug text-foreground">
        {task.title}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <InlinePriorityIcon
          variant="card"
          task={task}
          onSelect={(priority) => onUpdateTask(task.id, { priority })}
        />
        <InlineDueCompact
          variant="card"
          task={task}
          onSave={(due) => onUpdateTask(task.id, { due })}
        />
        {task.labels.map((label) => (
          <LabelChip key={label.id} label={label} size="sm" />
        ))}
      </div>

      <TaskCreatedLine createdAt={task.createdAt} />
    </div>
  );
}

export function TodoPanel({
  showAllProjects = false,
}: {
  showAllProjects?: boolean;
}) {
  const { t } = useTranslation("calendar");
  const { t: tProjects } = useTranslation("projects");
  const navigate = useNavigate();
  const { projects, loading, updateTask, createTask } = useProjects();
  const [createForColumn, setCreateForColumn] = useState<Status | null>(null);

  const storedProjectId = useActiveProjectId();
  const activeProject = useMemo(
    () => resolveActiveProject(projects, storedProjectId),
    [projects, storedProjectId],
  );

  const sections = useMemo(() => {
    const config = getTaskStatusFilterConfig(tProjects);
    const sourceProjects = showAllProjects
      ? projects
      : activeProject
        ? [activeProject]
        : [];
    return PANEL_STATUSES.map((status) => ({
      status,
      label: config.find((s) => s.value === status)?.label ?? status,
      color:
        config.find((s) => s.value === status)?.color ?? "var(--text-muted)",
      tasks: sourceProjects.flatMap(
        (project) =>
          project.columns
            .find((col) => col.id === status)
            ?.tasks.map((task) => ({ task, projectId: project.id })) ?? [],
      ),
    }));
  }, [activeProject, projects, showAllProjects, tProjects]);

  const totalCount = sections.reduce(
    (sum, section) => sum + section.tasks.length,
    0,
  );

  function openTask(taskId: string, projectId: string) {
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
  }

  if (loading) return <TodoPanelSkeleton />;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {totalCount === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-3 py-5 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t("todoPanel.empty")}
            </p>
            {activeProject && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateForColumn("todo")}
              >
                <Plus size={14} strokeWidth={2} />
                {tProjects("board.addTask")}
              </Button>
            )}
          </div>
        )}

        {sections.map(({ status, label, color, tasks }) => {
          if (tasks.length === 0) return null;
          const StatusIcon = TASK_STATUS_ICON[status];
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-1.5 px-1">
                <StatusIcon size={13} strokeWidth={2} style={{ color }} />
                <span className="text-xs font-medium text-foreground">
                  {label}
                </span>
                <span className="text-xs font-medium tabular-nums text-caption">
                  {tasks.length}
                </span>
                <button
                  type="button"
                  title={tProjects("board.addTaskInline")}
                  onClick={() => setCreateForColumn(status)}
                  className="ml-auto cursor-pointer rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-surface-overlay hover:text-foreground"
                >
                  <Plus size={13} strokeWidth={2} />
                </button>
              </div>
              {tasks.map(({ task, projectId }) => (
                <TodoTaskCard
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  onOpen={() => openTask(task.id, projectId)}
                  onUpdateTask={(taskId, patch) =>
                    void updateTask(taskId, projectId, patch)
                  }
                />
              ))}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {createForColumn && activeProject && (
          <CreateTaskDialog
            key={createForColumn}
            defaultColumnId={createForColumn}
            onClose={() => setCreateForColumn(null)}
            onCreate={(colId, task) =>
              createTask(activeProject.id, colId, task)
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
