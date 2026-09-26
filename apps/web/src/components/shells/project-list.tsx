import type { Project } from "@/components/projects/types";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { withAlphaHex } from "@/lib/project-color";
import { cn } from "@/lib/utils";
import { Archive, Check, Plus, Trash2 } from "@/components/icons";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

function FooterAction({
  icon,
  label,
  count,
  onClick,
  comfortable,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  comfortable?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center text-left font-medium text-muted-foreground transition-colors duration-fast hover:bg-surface-raised hover:text-foreground",
        comfortable
          ? "min-h-12 gap-3 rounded-xl px-3 py-2.5 text-base"
          : "gap-2 rounded-md px-2 py-1.5 text-sm",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center text-caption",
          comfortable ? "w-5" : "w-3.5",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "shrink-0 tabular-nums text-caption",
            comfortable ? "text-sm" : "text-2xs",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ProjectRow({
  project,
  isActive,
  onSelect,
  comfortable,
}: {
  project: Project;
  isActive: boolean;
  onSelect: (id: string) => void;
  comfortable?: boolean;
}) {
  return (
    <CommandItem
      value={project.name}
      onSelect={() => onSelect(project.id)}
      className={cn(
        comfortable
          ? "min-h-12 gap-3 rounded-xl px-3 py-2.5 [&_svg]:size-[1.125rem]"
          : "gap-2.5 px-2 py-1.5",
      )}
      style={isActive ? { background: withAlphaHex(project.color, "0d") } : undefined}
    >
      <ProjectAvatar project={project} size={comfortable ? 32 : 22} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-medium",
          comfortable ? "text-base" : "text-sm",
          isActive ? "text-ink" : "text-foreground",
        )}
      >
        {project.name}
      </span>
      {isActive && (
        <Check
          size={comfortable ? 18 : 14}
          strokeWidth={2.5}
          className="shrink-0 text-ink"
        />
      )}
    </CommandItem>
  );
}

export function ProjectList({
  activeProjects,
  archivedCount,
  trashedProjects,
  activeId,
  onSelect,
  onNewProject,
  onOpenArchive,
  onOpenTrash,
  comfortable = false,
}: {
  activeProjects: Project[];
  archivedCount: number;
  trashedProjects: Project[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onNewProject: () => void;
  onOpenArchive: () => void;
  onOpenTrash: () => void;
  comfortable?: boolean;
}) {
  const { t } = useTranslation("nav");
  const showSecondaryFooter = archivedCount > 0 || trashedProjects.length > 0;
  const iconSize = comfortable ? 18 : 14;

  return (
    <Command
      className={cn(
        "min-h-0 bg-transparent",
        comfortable &&
          "[&_[cmdk-input-wrapper]]:h-12 [&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5",
      )}
    >
      <div className="relative shrink-0">
        <CommandInput
          placeholder={t("findProject")}
          className={cn(comfortable ? "h-12 text-base" : "h-10")}
          onFocus={
            comfortable
              ? (event) => {
                  event.currentTarget.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                  });
                }
              : undefined
          }
        />
        {!comfortable && (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-caption">
            Esc
          </kbd>
        )}
      </div>

      {/* In the mobile drawer the height is capped from outside, so a fixed
          max-height here pushed the footer actions past the bottom edge. */}
      <CommandList
        className={comfortable ? "min-h-0 max-h-none flex-1" : "max-h-72"}
      >
        <CommandEmpty
          className={cn(
            "text-center text-muted-foreground",
            comfortable ? "py-10 text-base" : "py-6 text-sm",
          )}
        >
          {t("noProjectsFound")}
        </CommandEmpty>
        <CommandGroup className={comfortable ? "p-2" : "p-1"}>
          {activeProjects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              isActive={p.id === activeId}
              onSelect={onSelect}
              comfortable={comfortable}
            />
          ))}
        </CommandGroup>
      </CommandList>

      <div
        className={cn(
          "shrink-0 border-t border-border-subtle",
          comfortable ? "p-2" : "p-1",
        )}
      >
        <FooterAction
          icon={<Plus size={iconSize} strokeWidth={2} />}
          label={t("createProject")}
          onClick={onNewProject}
          comfortable={comfortable}
        />

        {showSecondaryFooter && (
          <div
            className={cn(
              "border-t border-border-subtle",
              comfortable ? "mt-1.5 space-y-0.5 pt-1.5" : "mt-1 space-y-0.5 pt-1",
            )}
          >
            {archivedCount > 0 && (
              <FooterAction
                icon={<Archive size={iconSize} />}
                label={t("archived")}
                count={archivedCount}
                onClick={onOpenArchive}
                comfortable={comfortable}
              />
            )}

            {trashedProjects.length > 0 && (
              <FooterAction
                icon={<Trash2 size={iconSize} />}
                label={t("deletedProjects")}
                count={trashedProjects.length}
                onClick={onOpenTrash}
                comfortable={comfortable}
              />
            )}
          </div>
        )}
      </div>
    </Command>
  );
}
