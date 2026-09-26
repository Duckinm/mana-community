import { ProjectAvatar } from "@/components/projects/project-avatar";
import { ArrowUpRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "@tanstack/react-router";

export function ProjectBadge({
  name,
  icon,
  color,
  className,
}: {
  name: string;
  icon?: string | null;
  color: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex max-w-full min-w-0 items-center gap-1.5 text-xs font-medium text-foreground",
            className,
          )}
        >
          <ProjectAvatar
            project={{ name, color, icon: icon ?? undefined }}
            size={18}
          />
          <span className="min-w-0 truncate">{name}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{name}</TooltipContent>
    </Tooltip>
  );
}

export function ProjectLinkBadge({
  project,
  className,
}: {
  project: { id: string; name: string; color: string; icon?: string | null };
  className?: string;
}) {
  return (
    <Link
      to="/projects/$projectId/overview"
      params={{ projectId: project.id }}
      data-testid="contact-project-link"
      className={cn(
        "group inline-flex max-w-full items-center gap-2 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs font-medium text-foreground transition-colors duration-base hover:border-primary-border hover:bg-primary-soft focus-visible:border-primary-border focus-visible:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
    >
      <ProjectAvatar
        project={{ ...project, icon: project.icon ?? undefined }}
        size={18}
      />
      <span className="min-w-0 truncate">{project.name}</span>
      <ArrowUpRight
        size={12}
        aria-hidden="true"
        className="shrink-0 text-primary opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </Link>
  );
}
