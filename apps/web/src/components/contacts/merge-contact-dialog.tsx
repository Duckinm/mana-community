import type { Contact } from "@/components/contacts/types";
import { ArrowRight, Check, GitMerge, Search } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface MergeContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  allContacts: Contact[];
}

interface PreviewField {
  label: string;
  primary: string;
  secondary: string;
}

const PREVIEW_FIELD_KEYS: Array<{ labelKey: string; key: keyof Contact }> = [
  { labelKey: "fieldName", key: "name" },
  { labelKey: "fieldRole", key: "role" },
  { labelKey: "fieldCompany", key: "company" },
  { labelKey: "fieldEmail", key: "email" },
  { labelKey: "fieldPhone", key: "phone" },
  { labelKey: "fieldWebsite", key: "website" },
];

function buildPreviewFields(
  primary: Contact,
  secondary: Contact,
  t: (key: string) => string,
): PreviewField[] {
  return PREVIEW_FIELD_KEYS.map(({ labelKey, key }) => ({
    label: t(`merge.${labelKey}`),
    primary: String(primary[key] ?? ""),
    secondary: String(secondary[key] ?? ""),
  }));
}

export function MergeContactDialog({
  open,
  onOpenChange,
  contact,
  allContacts,
}: MergeContactDialogProps) {
  const { t } = useTranslation("contacts");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);

  const candidates = allContacts
    .filter((c) => c.id !== contact.id)
    .filter(
      (c) =>
        !query.trim() ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.company.toLowerCase().includes(query.toLowerCase()),
    );

  const previewFields = selected
    ? buildPreviewFields(contact, selected, t)
    : [];

  function reset() {
    setQuery("");
    setSelected(null);
  }

  async function handleMerge() {
    if (!selected) return;
    setLoading(true);
    try {
      expectEden(
        await client.api
          .contacts({ id: contact.id })
          .merge.post({ mergeIntoId: selected.id }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      toast.success(
        t("merge.merged", { from: selected.name, into: contact.name }),
      );
      reset();
      onOpenChange(false);
      navigate({
        to: "/contacts/$contactId",
        params: { contactId: contact.id },
        search: { q: "", sort: "projects", edit: false },
      });
    } catch {
      toast.error(t("merge.mergeFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) {
          onOpenChange(o);
          if (!o) reset();
        }
      }}
    >
      <DialogContent className="flex h-[min(85vh,600px)] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold">
            {t("merge.title")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("merge.primary")}{" "}
            <span className="font-medium text-foreground">{contact.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-3">
          {!selected ? (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-card border border-border-subtle shrink-0">
                <Search
                  size={14}
                  strokeWidth={2}
                  className="text-muted-foreground shrink-0"
                />
                <input
                  type="text"
                  placeholder={t("merge.searchPlaceholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
                {candidates.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">
                    {query
                      ? t("merge.noMatch", { query })
                      : t("merge.noOthers")}
                  </p>
                ) : (
                  candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-surface-raised border border-transparent hover:border-border-subtle transition-all duration-base"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium shrink-0"
                        style={{
                          background: `${c.color}20`,
                          color: c.color,
                        }}
                      >
                        {c.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.role || c.company || t("merge.noDetails")}
                        </p>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100"
                        strokeWidth={2}
                      />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-card border border-border-subtle">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium shrink-0"
                      style={{
                        background: `${selected.color}20`,
                        color: selected.color,
                      }}
                    >
                      {selected.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t("merge.merging")}
                      </p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {selected.name}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-muted-foreground shrink-0"
                    strokeWidth={2}
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium shrink-0"
                      style={{
                        background: `${contact.color}20`,
                        color: contact.color,
                      }}
                    >
                      {contact.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t("merge.into")}
                      </p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {contact.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {t("merge.fieldPreview")}
                  </p>
                  <div className="rounded-xl border border-border-subtle overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface-raised border-b border-border-subtle">
                          <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-muted-foreground w-20">
                            {t("merge.field")}
                          </th>
                          <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-success w-[45%]">
                            {t("merge.kept", { name: contact.name })}
                          </th>
                          <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-muted-foreground w-[45%]">
                            {t("merge.removed", { name: selected.name })}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewFields.map((f) => (
                          <tr
                            key={f.label}
                            className="border-b border-border-subtle last:border-0"
                          >
                            <td className="px-3 py-2 text-muted-foreground font-medium">
                              {f.label}
                            </td>
                            <td className="px-3 py-2 text-foreground truncate max-w-[160px]">
                              {f.primary ? (
                                <span className="flex items-center gap-1">
                                  <Check
                                    size={10}
                                    className="text-success shrink-0"
                                    strokeWidth={2.5}
                                  />
                                  {f.primary}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground line-through truncate max-w-[160px] opacity-50">
                              {f.secondary || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-caption text-xs mt-2">
                    {t("merge.combinedNote")}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="drawer-footer justify-between">
          {selected ? (
            <button
              type="button"
              onClick={() => setSelected(null)}
              disabled={loading}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {t("merge.back")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              disabled={loading}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {t("merge.cancel")}
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => void handleMerge()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    {t("merge.mergeButtonBusy")}
                  </>
                ) : (
                  <>
                    <GitMerge size={13} strokeWidth={2.5} />
                    {t("merge.mergeContacts")}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
