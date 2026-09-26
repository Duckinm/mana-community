import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { NewDocumentMenu } from "@/components/documents/new-document-menu";
import type { Document, DocumentType } from "@/components/documents/types";
import {
  ArrowUpRight,
  Ellipsis,
  FileText,
  Plus,
  Receipt,
  ScrollText,
} from "@/components/icons";
import { formatTaskDueDisplay } from "@/components/projects/due-helpers";
import type { Project } from "@/components/projects/types";
import { kindColor } from "@/components/storage/file-icon";
import type { StorageFile } from "@/components/storage/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContacts } from "@/context/contacts";
import { useStorage } from "@/context/storage";
import { useDocumentsList } from "@/hooks/use-documents";
import { formatCalendarDate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function FileChip({
  file,
  projectId,
}: {
  file: StorageFile;
  projectId: string;
}) {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  return (
    <Link
      to="/projects/$projectId/storage/$fileId/modal"
      params={{ projectId, fileId: file.id }}
      className="flex max-w-28 min-w-0 items-center gap-1.5 text-sm text-foreground transition-opacity hover:opacity-75"
    >
      <FileText
        size={16}
        className="shrink-0"
        style={{ color: kindColor(file.kind) }}
        strokeWidth={2}
      />
      <span className="flex min-w-0">
        <span className="truncate">{base}</span>
        <span className="shrink-0">{ext}</span>
      </span>
    </Link>
  );
}

const DOC_STAGES: {
  type: DocumentType;
  key: "stageQuotation" | "stageInvoice" | "stageReceipt";
  Icon: typeof FileText;
}[] = [
  { type: "QO", key: "stageQuotation", Icon: ScrollText },
  { type: "INV", key: "stageInvoice", Icon: FileText },
  { type: "RC", key: "stageReceipt", Icon: Receipt },
];

function PropertyRow({
  label,
  children,
  valueClassName,
}: {
  label: string;
  children: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5",
          valueClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-foreground">
      {children}
    </div>
  );
}

function DocChip({
  label,
  Icon,
  docs,
  projectId,
}: {
  label: string;
  Icon: typeof FileText;
  docs: Document[];
  projectId: string;
}) {
  const { t } = useTranslation("projects");
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  const labelEl = <span className="hidden sm:inline">{label}</span>;

  if (docs.length === 0) {
    return (
      <span
        title={label}
        aria-label={label}
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Icon size={16} className="shrink-0" strokeWidth={2} aria-hidden />
        {labelEl}
      </span>
    );
  }
  if (docs.length === 1) {
    return (
      <Link
        to="/projects/$projectId/documents/$documentId/modal"
        params={{ projectId, documentId: docs[0].id }}
        aria-label={label}
        title={label}
        className="flex items-center gap-1.5 text-sm text-foreground transition-opacity hover:opacity-75"
      >
        <Icon size={16} className="shrink-0 text-primary" strokeWidth={2} />
        {labelEl}
      </Link>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="flex items-center gap-1.5 text-sm text-foreground transition-opacity hover:opacity-75"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
        >
          <span className="relative shrink-0">
            <Icon size={17} className="text-primary" strokeWidth={2} />
            <span className="absolute -bottom-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground tabular-nums ring-2 ring-card">
              {docs.length}
            </span>
          </span>
          {labelEl}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-56 p-1 duration-200"
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
      >
        <div className="space-y-0.5">
          {docs.map((doc) => (
            <Link
              key={doc.id}
              to="/projects/$projectId/documents/$documentId/modal"
              params={{ projectId, documentId: doc.id }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-surface-raised transition-colors duration-fast text-left"
            >
              <span className="text-xs font-medium text-foreground truncate">
                {doc.number}
              </span>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <DocumentStatusBadge
                  status={doc.status}
                  type={doc.type}
                  dueDate={doc.dueDate}
                />
                {doc.dueDate && (
                  <span className="text-2xs text-muted-foreground tabular-nums">
                    {t("overview.due_date", {
                      date: formatCalendarDate(doc.dueDate),
                    })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ProjectPropertiesRow({
  project,
  onLinkContact,
}: {
  project: Project;
  onLinkContact: (contactId: string | null) => void;
}) {
  const { t } = useTranslation("projects");
  const { contacts } = useContacts();
  const { getEntityFiles, getEntityFolder } = useStorage();
  const { data: docsData } = useDocumentsList({
    projectId: project.id,
    limit: 100,
  });
  const docs: Document[] = docsData?.data ?? [];
  const byType = (type: DocumentType) => docs.filter((d) => d.type === type);
  const files = getEntityFiles("project", project.id);
  const visibleFiles = files.slice(0, 3);
  const overflowCount = files.length - visibleFiles.length;
  const folderId = getEntityFolder("project", project.id)?.id ?? project.id;
  const contact = contacts.find((c) => c.id === project.contactId);

  return (
    <div className="py-1">
      <PropertyRow label={t("overview.client")}>
        <div className="flex min-w-0 items-center gap-1.5">
          <Select
            value={project.contactId ?? "__none__"}
            onValueChange={(id) => onLinkContact(id === "__none__" ? null : id)}
          >
            <SelectTrigger
              hideIcon
              className="h-auto min-h-0 w-auto min-w-0 justify-start gap-1 border-none bg-transparent px-0 py-0 text-sm shadow-none [@media(pointer:coarse)]:h-auto"
            >
              <SelectValue placeholder={t("overview.noContactLinked")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                {t("overview.noContactLinked")}
              </SelectItem>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {contact && (
            <Link
              to="/contacts/$contactId"
              params={{ contactId: contact.id }}
              search={{ q: "", sort: "projects", edit: false }}
              className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground transition-opacity hover:opacity-75"
            >
              <ArrowUpRight size={16} strokeWidth={2} />
            </Link>
          )}
        </div>
      </PropertyRow>

      {project.dueDate && (
        <PropertyRow label={t("overview.due")}>
          <Chip>{formatTaskDueDisplay(project.dueDate)}</Chip>
        </PropertyRow>
      )}

      <PropertyRow
        label={t("overview.documents")}
        valueClassName="flex-nowrap gap-x-2.5 sm:gap-x-3"
      >
        {DOC_STAGES.map(({ type, key, Icon }) => (
          <DocChip
            key={type}
            label={t(`overview.${key}`)}
            Icon={Icon}
            docs={byType(type)}
            projectId={project.id}
          />
        ))}
        <NewDocumentMenu
          projectId={project.id}
          align="start"
          trigger={
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
              aria-label={t("overview.newDocument")}
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          }
        />
      </PropertyRow>

      <PropertyRow
        label={t("overview.files")}
        valueClassName="gap-x-2.5"
      >
        {visibleFiles.length === 0 && files.length === 0 ? (
          <Chip>
            <span className="text-muted-foreground">
              {t("overview.noFiles")}
            </span>
          </Chip>
        ) : (
          visibleFiles.map((file) => (
            <FileChip key={file.id} file={file} projectId={project.id} />
          ))
        )}
        {overflowCount > 0 && (
          <Link
            to="/storage/$folderId"
            params={{ folderId }}
            search={{ q: "", sort: "name-asc", kind: "all", tag: undefined }}
            className="text-sm text-muted-foreground transition-opacity hover:opacity-75"
          >
            <Ellipsis size={16} strokeWidth={2} />
          </Link>
        )}
      </PropertyRow>
    </div>
  );
}
