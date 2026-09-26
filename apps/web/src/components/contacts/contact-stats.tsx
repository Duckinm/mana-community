import type { Contact } from "@/components/contacts/types";
import { Archive, Folder, FolderKanban, Receipt } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStorage } from "@/context/storage";
import { formatBinaryBytes } from "@/lib/format-bytes";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

function formatBilledAmount(cents: number, currency = "THB"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(cents / 100);
}

const CARD =
  "surface-card relative min-w-0 overflow-hidden rounded-xl p-4 text-left";

const TONES = {
  primary: { chip: "bg-primary-soft", text: "text-primary", blob: "bg-primary" },
  success: { chip: "bg-success-soft", text: "text-success", blob: "bg-success" },
  warning: { chip: "bg-warning-soft", text: "text-warning", blob: "bg-warning" },
} as const;

function Metric({
  label,
  children,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  children: ReactNode;
  hint: string;
  icon: typeof Receipt;
  tone: keyof typeof TONES;
}) {
  const { chip, text, blob } = TONES[tone];
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-10 blur-2xl",
          blob,
        )}
      />
      <div
        className={cn(
          "mb-2 flex h-7 w-7 items-center justify-center rounded-lg",
          chip,
        )}
      >
        <Icon size={14} strokeWidth={2} className={text} />
      </div>
      <p className="mb-1 truncate text-xs font-medium text-foreground/75">
        {label}
      </p>
      <div
        className={cn(
          "truncate font-sans text-xl font-light tracking-tight tabular-nums",
          text,
        )}
      >
        {children}
      </div>
      <p className="mt-1 truncate text-2xs leading-snug text-caption">{hint}</p>
    </>
  );
}

export function ContactStats({
  contact,
  className,
}: {
  contact: Contact;
  className?: string;
}) {
  const { t } = useTranslation("contacts");
  const { getEntityFiles } = useStorage();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const files = getEntityFiles("contact", contact.id);
  const fileBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
  const activeProjects = contact.linkedProjects.filter(
    (project) => !project.archived,
  );
  const archivedProjects = contact.linkedProjects.filter(
    (project) => project.archived,
  );
  const visibleProjects = showArchived ? archivedProjects : activeProjects;
  const activeProjectCount =
    contact.activeProjectCount ?? activeProjects.length;

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3", className)}>
      <div className={CARD}>
        <Metric
          label={t("stats.totalBilled")}
          hint={t("stats.reconciledReceipts")}
          icon={Receipt}
          tone="primary"
        >
          {formatBilledAmount(contact.totalBilledCents ?? 0)}
        </Metric>
      </div>
      <Popover
        open={projectsOpen}
        onOpenChange={(open) => {
          setProjectsOpen(open);
          if (!open) setShowArchived(false);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              CARD,
              "w-full transition-colors duration-base hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <Metric
              label={t("stats.projects")}
              hint={
                activeProjectCount > 0
                  ? t("stats.activeCount", { count: activeProjectCount })
                  : t("stats.noActiveProjects")
              }
              icon={FolderKanban}
              tone="success"
            >
              {activeProjectCount}
            </Metric>
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-60 p-0">
          <div className="border-b border-border-subtle px-3 py-2">
            <p className="text-xs font-medium text-foreground">
              {showArchived
                ? t("stats.archivedProjects")
                : t("stats.activeProjects")}
            </p>
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {showArchived
                ? t("stats.archivedCount", { count: archivedProjects.length })
                : t("stats.activeCount", { count: activeProjects.length })}
            </p>
          </div>
          {visibleProjects.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-caption">
              {showArchived
                ? t("stats.noArchivedProjects")
                : t("stats.noActiveProjects")}
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto p-1">
              {visibleProjects.map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId/overview"
                params={{ projectId: project.id }}
                onClick={() => setProjectsOpen(false)}
                className="block truncate rounded-md px-3 py-2 text-xs text-foreground transition-colors duration-base hover:bg-surface-raised"
              >
                {project.name}
              </Link>
              ))}
            </div>
          )}
          {archivedProjects.length > 0 && (
            <div className="border-t border-border-subtle p-1">
              <button
                type="button"
                onClick={() => setShowArchived((value) => !value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors duration-base hover:bg-surface-raised hover:text-foreground"
              >
                <Archive size={12} />
                {showArchived
                  ? t("stats.backToActive")
                  : t("stats.viewArchived", {
                      count: archivedProjects.length,
                    })}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <div className={CARD}>
        <Metric
          label={t("files.title")}
          hint={t("stats.fileTotal", { size: formatBinaryBytes(fileBytes) })}
          icon={Folder}
          tone="warning"
        >
          {files.length}
        </Metric>
      </div>
    </div>
  );
}
