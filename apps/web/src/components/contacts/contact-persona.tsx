import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { EditContactModal } from "@/components/contacts/edit-contact-modal";
import { MergeContactDialog } from "@/components/contacts/merge-contact-dialog";
import { displayContactTags } from "@/components/contacts/constants";
import type { Contact } from "@/components/contacts/types";
import {
  Download,
  GitMerge,
  Loader2,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContacts } from "@/context/contacts";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const BASE_URL = resolveApiBaseUrl();

export function ContactPersona({
  contact,
  editing,
  onEditingChange,
  detailsOpen,
  onToggleDetails,
}: {
  contact: Contact;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
}) {
  const { t } = useTranslation("contacts");
  const {
    deleteContact,
    contacts,
    sidebarOpen,
    toggleSidebar,
    setImportOpen,
    setNewContactOpen,
  } = useContacts();
  const navigate = useNavigate();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const tags = displayContactTags(contact.tags);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteContact(contact.id);
      setDeleteDialogOpen(false);
      navigate({ to: "/contacts", search: { q: "", sort: "projects" } });
    } finally {
      setDeleting(false);
    }
  }

  async function handleExportVcard() {
    const res = await fetch(`${BASE_URL}/api/contacts/${contact.id}/vcard`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contact.name}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors duration-base sm:h-8 xl:w-8 xl:px-0 ${sidebarOpen ? "border-primary-border bg-primary-soft text-primary" : "border-border-subtle bg-surface-raised text-muted-foreground hover:text-foreground"}`}
          title={
            sidebarOpen ? t("layout.hideDirectory") : t("layout.showDirectory")
          }
        >
          <PanelLeft size={15} strokeWidth={1.75} className="shrink-0" />
          <span className="xl:hidden">{t("layout.title")}</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <div className="grid grid-cols-2 gap-2 sm:w-[17rem]">
            <button
              type="button"
              aria-label={t("layout.import")}
              onClick={() => setImportOpen(true)}
              className="inline-flex size-9 items-center justify-center gap-1.5 rounded-lg border border-border-default bg-surface-card text-xs font-medium text-foreground transition-colors hover:bg-surface-raised sm:h-8 sm:w-full sm:px-3"
            >
              <Upload size={13} strokeWidth={2} className="shrink-0" />
              <span className="hidden sm:inline">{t("layout.import")}</span>
            </button>
            <button
              type="button"
              aria-label={t("layout.newContact")}
              onClick={() => setNewContactOpen(true)}
              className="inline-flex size-9 items-center justify-center gap-1.5 rounded-lg border border-border-default bg-surface-card text-xs font-medium text-foreground transition-colors hover:bg-surface-raised sm:h-8 sm:w-full sm:px-3"
            >
              <Plus size={13} strokeWidth={2} className="shrink-0" />
              <span className="hidden sm:inline">{t("layout.newContact")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleDetails}
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-base sm:size-8 ${detailsOpen ? "border-primary-border bg-primary-soft text-primary" : "border-border-subtle bg-surface-raised text-muted-foreground hover:text-foreground"}`}
            title={
              detailsOpen ? t("layout.hideDetails") : t("layout.showDetails")
            }
          >
            <PanelRight size={15} strokeWidth={1.75} className="-scale-x-100" />
          </button>
        </div>
      </div>

      <div
        data-testid="contact-profile-header"
        className="mb-6 flex min-w-0 items-center justify-between gap-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div
            data-testid="contact-avatar"
            className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full font-sans text-base font-medium"
            style={{
              background: `${contact.color}20`,
              border: `1px solid ${contact.color}40`,
              color: contact.color,
            }}
          >
            {contact.imageUrl ? (
              <img
                src={contact.imageUrl}
                alt={contact.name}
                className="size-full object-cover"
              />
            ) : (
              contact.initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-medium leading-tight tracking-[-0.025em] text-foreground">
              {contact.name}
            </h2>
            {/* min-h reserves the pill row so content below sits at the same height for contacts without tags */}
            <div
              data-testid="contact-tags"
              className="mt-2 flex min-h-[1.625rem] flex-wrap items-center gap-1.5"
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  data-testid="contact-tag"
                  className="rounded-full border border-border-default bg-surface-raised px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-base hover:bg-surface-raised hover:text-foreground sm:size-8"
              aria-label={t("persona.moreOptions")}
            >
              <MoreHorizontal size={15} strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => onEditingChange(true)}
              className="gap-2"
            >
              <Pencil size={14} strokeWidth={2} />
              {t("persona.editContact")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void handleExportVcard()}
              className="gap-2"
            >
              <Download size={14} strokeWidth={2} />
              {t("persona.exportVcard")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setMergeOpen(true)}
              className="gap-2"
            >
              <GitMerge size={14} strokeWidth={2} />
              {t("persona.mergeWith")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 size={14} strokeWidth={2} />
              {t("persona.deleteContact")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditContactModal
        contact={contact}
        open={editing}
        onOpenChange={onEditingChange}
      />

      <MergeContactDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        contact={contact}
        allContacts={contacts}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border border-border-subtle bg-surface-card sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("persona.deleteConfirmTitle", { name: contact.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("persona.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("persona.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  {t("persona.deleting")}
                </span>
              ) : (
                t("persona.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
