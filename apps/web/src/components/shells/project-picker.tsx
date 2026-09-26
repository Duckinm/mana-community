import { ProjectAvatar } from "@/components/projects/project-avatar";
import type { Project } from "@/components/projects/types";
import { AppSidebarProjectsSkeleton } from "@/components/shells/app-sidebar-projects-skeleton";
import { ProjectList } from "@/components/shells/project-list";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sidebarRowHoverHandlers } from "@/lib/sidebar-row-hover";
import { cn } from "@/lib/utils";
import { ChevronsUpDownIcon, Kanban } from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ProjectPicker({
  projects,
  trashedProjects,
  loading = false,
  activeProject,
  collapsed,
  onSelect,
  onNewProject,
  onOpenArchive,
  onOpenTrash,
  popoverSide,
  popoverAlign = "start",
  triggerClassName,
  dock = false,
}: {
  projects: Project[];
  trashedProjects: Project[];
  loading?: boolean;
  activeProject: Project | undefined;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onNewProject: () => void;
  onOpenArchive: () => void;
  onOpenTrash: () => void;
  popoverSide?: "top" | "right" | "bottom" | "left";
  popoverAlign?: "start" | "center" | "end";
  triggerClassName?: string;
  dock?: boolean;
}) {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useState(false);
  const activeProjects = projects.filter((p) => !p.archived);
  const archivedCount = projects.filter((p) => p.archived).length;

  const listProps = {
    activeProjects,
    archivedCount,
    trashedProjects,
    activeId: activeProject?.id,
    onSelect: (id: string) => {
      setOpen(false);
      onSelect(id);
    },
    onNewProject: () => {
      setOpen(false);
      onNewProject();
    },
    onOpenArchive: () => {
      setOpen(false);
      onOpenArchive();
    },
    onOpenTrash: () => {
      setOpen(false);
      onOpenTrash();
    },
  };

  const trigger = dock ? (
    <button
      type="button"
      aria-label={activeProject ? activeProject.name : t("selectProject")}
      className={
        triggerClassName ??
        "flex size-9 items-center justify-center rounded-full text-foreground transition-colors"
      }
    >
      <ChevronsUpDownIcon size={18} strokeWidth={1.75} />
    </button>
  ) : collapsed ? (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:border-border-strong"
      {...sidebarRowHoverHandlers}
    >
      {activeProject ? (
        <ProjectAvatar project={activeProject} size={18} />
      ) : (
        <Kanban size={16} strokeWidth={1.5} />
      )}
    </button>
  ) : (
    <button
      type="button"
      className="flex h-9 w-full items-center gap-2.5 rounded-md border border-input bg-card px-3 text-[0.8125rem] transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:border-border-strong"
      {...sidebarRowHoverHandlers}
    >
      {activeProject ? (
        <ProjectAvatar project={activeProject} size={16} />
      ) : (
        <Kanban
          size={14}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground"
        />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-left font-medium ${activeProject ? "text-foreground" : "text-muted-foreground"}`}
      >
        {activeProject ? activeProject.name : t("selectProject")}
      </span>
      <ChevronsUpDownIcon
        size={14}
        className="shrink-0 text-muted-foreground opacity-70"
      />
    </button>
  );

  const side = popoverSide ?? (collapsed || dock ? "right" : "bottom");
  const sideOffset = dock ? 12 : collapsed ? 8 : 4;

  const popover = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        sideOffset={sideOffset}
        align={popoverAlign}
        collisionPadding={16}
        onOpenAutoFocus={
          dock
            ? (event) => {
                event.preventDefault();
              }
            : undefined
        }
        className={cn(
          "flex flex-col overflow-hidden border-input bg-modal p-0 shadow-popup",
          dock
            ? "w-[min(22rem,calc(100vw-1.5rem))] max-xl:w-full max-xl:max-w-none"
            : collapsed
              ? "w-[min(16rem,calc(100vw-2rem))]"
              : "w-[min(18rem,calc(100vw-2rem))]",
        )}
      >
        {loading ? (
          <div className={dock ? "p-3" : "p-2"}>
            <AppSidebarProjectsSkeleton />
          </div>
        ) : (
          <ProjectList {...listProps} comfortable={dock} />
        )}
      </PopoverContent>
    </Popover>
  );

  if (!collapsed || dock) return popover;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{popover}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {activeProject ? activeProject.name : "Projects"}
      </TooltipContent>
    </Tooltip>
  );
}
