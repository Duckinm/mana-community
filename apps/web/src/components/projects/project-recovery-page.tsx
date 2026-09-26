import { ProjectAvatar } from "@/components/projects/project-avatar";
import type { Project } from "@/components/projects/types";
import { Archive, ArchiveRestore, RotateCcw, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/context/projects";
import i18next from "@/lib/i18n";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function daysRemaining(deletedAt: string) {
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  return Math.max(0, 14 - Math.floor(elapsed / (1000 * 60 * 60 * 24)));
}

function formatDeletedDate(deletedAt: string) {
  return new Date(deletedAt).toLocaleDateString(i18next.language, {
    month: "short",
    day: "numeric",
  });
}

function RecoveryEmpty({ type }: { type: "archive" | "trash" }) {
  const { t } = useTranslation("projects");
  const Icon = type === "archive" ? Archive : Trash2;

  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <div className="flex size-9 items-center justify-center rounded-xl bg-surface-raised text-muted-foreground">
        <Icon size={17} strokeWidth={1.5} />
      </div>
      <p className="text-sm text-muted-foreground">
        {type === "archive" ? t("archivedPanel.empty") : t("trashPanel.empty")}
      </p>
    </div>
  );
}

function ArchivedRow({
  project,
  pending,
  onRestore,
}: {
  project: Project;
  pending: boolean;
  onRestore: () => Promise<void>;
}) {
  const { t } = useTranslation("projects");
  const tasks = project.columns.flatMap((column) => column.tasks);
  const done = tasks.filter((task) => task.status === "done").length;

  return (
    <li className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
      <ProjectAvatar project={project} size={32} className="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("archivedPanel.tasksDone", { done, total: tasks.length })}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        disabled={pending}
        onClick={() => void onRestore()}
      >
        <ArchiveRestore size={13} strokeWidth={1.75} />
        {t("archivedPanel.revert")}
      </Button>
    </li>
  );
}

function TrashedRow({
  project,
  pending,
  onRestore,
}: {
  project: Project;
  pending: boolean;
  onRestore: () => Promise<void>;
}) {
  const { t } = useTranslation("projects");
  const days = project.deletedAt ? daysRemaining(project.deletedAt) : 14;

  return (
    <li className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
      <ProjectAvatar project={project} size={32} className="rounded-lg opacity-65" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {project.deletedAt && (
            <span>{t("trashPanel.deleted", { date: formatDeletedDate(project.deletedAt) })}</span>
          )}
          <span className={days <= 3 ? "font-medium text-destructive" : undefined}>
            {t("trashPanel.daysLeft", { count: days })}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        disabled={pending}
        onClick={() => void onRestore()}
      >
        <RotateCcw size={13} strokeWidth={1.75} />
        {t("trashPanel.restore")}
      </Button>
    </li>
  );
}

export function ProjectRecoveryPage() {
  const { t } = useTranslation("projects");
  const { projects, trashedProjects, updateProject, restoreProject } = useProjects();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const archivedProjects = projects.filter((project) => project.archived);

  async function restoreArchived(id: string) {
    setPendingId(id);
    try {
      await updateProject({ id, archived: false });
    } finally {
      setPendingId(null);
    }
  }

  async function restoreDeleted(id: string) {
    setPendingId(id);
    try {
      await restoreProject(id);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-muted-foreground">
          <Archive size={19} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{t("archivedPanel.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("archivedPanel.count", { count: archivedProjects.length })}</p>
        </div>
      </header>

      <section className="list-shell overflow-hidden" aria-labelledby="archived-projects-heading">
        <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-raised/50 px-4 py-3 sm:px-5">
          <Archive size={14} className="text-muted-foreground" strokeWidth={1.75} />
          <h2 id="archived-projects-heading" className="text-sm font-semibold text-foreground">
            {t("archivedPanel.title")}
          </h2>
          <span className="text-xs text-muted-foreground">{archivedProjects.length}</span>
        </div>
        {archivedProjects.length === 0 ? (
          <RecoveryEmpty type="archive" />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {archivedProjects.map((project) => (
              <ArchivedRow
                key={project.id}
                project={project}
                pending={pendingId === project.id}
                onRestore={() => restoreArchived(project.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="list-shell overflow-hidden" aria-labelledby="deleted-projects-heading">
        <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-raised/50 px-4 py-3 sm:px-5">
          <Trash2 size={14} className="text-destructive" strokeWidth={1.75} />
          <div>
            <h2 id="deleted-projects-heading" className="text-sm font-semibold text-foreground">
              {t("trashPanel.title")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("trashPanel.subtitle")}</p>
          </div>
        </div>
        {trashedProjects.length === 0 ? (
          <RecoveryEmpty type="trash" />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {trashedProjects.map((project) => (
              <TrashedRow
                key={project.id}
                project={project}
                pending={pendingId === project.id}
                onRestore={() => restoreDeleted(project.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
