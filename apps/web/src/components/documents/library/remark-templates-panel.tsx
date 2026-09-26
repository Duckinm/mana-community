import { RemarkTemplatesPanelSkeleton } from "@/components/documents/library/remark-templates-panel-skeleton";
import type { RemarkTemplate } from "@/components/documents/remark-template-types";
import type { DocumentType } from "@/components/documents/types";
import {
  DOCUMENT_TYPE_KEYS,
  DOCUMENT_TYPE_ORDER,
} from "@/components/documents/constants";
import {
  AlertCircle,
  Check,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useRemarkTemplates } from "@/hooks/use-remark-templates";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

type RemarkTemplateForm = {
  name: string;
  body: string;
  isDefault: boolean;
  defaultFor: DocumentType[];
};

function emptyTemplateForm(): RemarkTemplateForm {
  return { name: "", body: "", isDefault: false, defaultFor: [] };
}

function templateToForm(template: RemarkTemplate): RemarkTemplateForm {
  return {
    name: template.name,
    body: template.body,
    isDefault: template.defaultFor.length > 0,
    defaultFor: template.defaultFor,
  };
}

function formsEqual(a: RemarkTemplateForm, b: RemarkTemplateForm): boolean {
  return (
    a.name === b.name &&
    a.body === b.body &&
    a.isDefault === b.isDefault &&
    DOCUMENT_TYPE_ORDER.every(
      (type) => a.defaultFor.includes(type) === b.defaultFor.includes(type),
    )
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function RemarkDefaultChips({
  template,
  onToggleDefault,
  settingDefault,
}: {
  template: RemarkTemplate;
  onToggleDefault: (id: string, documentType: DocumentType) => void;
  settingDefault: boolean;
}) {
  const { t } = useTranslation("documents");

  return (
    <div className="flex flex-wrap gap-1.5">
      {DOCUMENT_TYPE_ORDER.map((documentType) => {
        const selected = template.defaultFor.includes(documentType);
        const documentLabel = t(DOCUMENT_TYPE_KEYS[documentType]);
        return (
          <button
            key={documentType}
            type="button"
            aria-pressed={selected}
            aria-label={t(
              selected
                ? "remarkTemplatesPanel.unsetDefaultForDocumentType"
                : "remarkTemplatesPanel.setDefaultForDocumentType",
              { documentType: documentLabel },
            )}
            disabled={settingDefault}
            onClick={() => onToggleDefault(template.id, documentType)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected
                ? "border-primary-border bg-primary-soft text-primary hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
                : "border-border-default bg-surface-card text-muted-foreground hover:border-primary-border hover:text-foreground",
              settingDefault && "opacity-50",
            )}
          >
            {selected ? (
              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
            ) : null}
            {documentLabel}
          </button>
        );
      })}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-danger-soft border border-danger/20 px-3 py-2.5 text-xs text-danger">
      <AlertCircle size={13} className="shrink-0" />
      {message}
    </div>
  );
}

function RemarkTemplateFields({
  form,
  idPrefix,
  autoFocus,
  set,
}: {
  form: RemarkTemplateForm;
  idPrefix: string;
  autoFocus?: boolean;
  set: <K extends keyof RemarkTemplateForm>(
    key: K,
    value: RemarkTemplateForm[K],
  ) => void;
}) {
  const { t } = useTranslation("documents");
  return (
    <>
      <FormField
        label={t("remarkTemplatesPanel.nameLabel")}
        htmlFor={`${idPrefix}-name`}
      >
        <Input
          id={`${idPrefix}-name`}
          autoFocus={autoFocus}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("remarkTemplatesPanel.namePlaceholder")}
        />
      </FormField>
      <FormField
        label={t("remarkTemplatesPanel.bodyLabel")}
        htmlFor={`${idPrefix}-body`}
      >
        <Textarea
          id={`${idPrefix}-body`}
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          rows={8}
          className="resize-y min-h-[8rem] text-xs"
          placeholder={t("remarkTemplatesPanel.bodyPlaceholder")}
        />
      </FormField>
      <div className="rounded-lg border border-border-subtle bg-surface-raised/50">
        <label
          htmlFor={`${idPrefix}-default`}
          className="flex cursor-pointer items-center justify-between gap-4 px-3 py-3"
        >
          <div>
            <p className="text-xs font-medium text-foreground">
              {t("remarkTemplatesPanel.setDefault")}
            </p>
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {t("remarkTemplatesPanel.setDefaultHint")}
            </p>
          </div>
          <Switch
            id={`${idPrefix}-default`}
            size="sm"
            checked={form.isDefault}
            onCheckedChange={(checked) => set("isDefault", checked)}
            aria-controls={`${idPrefix}-document-types`}
          />
        </label>
        {form.isDefault && (
          <div
            id={`${idPrefix}-document-types`}
            className="border-t border-border-subtle px-3 py-3"
          >
            <p className="mb-2 text-2xs font-medium text-caption">
              {t("remarkTemplatesPanel.defaultFor")}
            </p>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TYPE_ORDER.map((documentType) => {
                const selected = form.defaultFor.includes(documentType);
                return (
                  <button
                    key={documentType}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      set(
                        "defaultFor",
                        DOCUMENT_TYPE_ORDER.filter((type) =>
                          type === documentType
                            ? !selected
                            : form.defaultFor.includes(type),
                        ),
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      selected
                        ? "border-primary-border bg-primary-soft text-primary"
                        : "border-border-default bg-surface-card text-muted-foreground hover:border-primary-border hover:text-foreground",
                    )}
                  >
                    {t(DOCUMENT_TYPE_KEYS[documentType])}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const TABLE_GRID =
  "grid min-w-[42rem] grid-cols-[minmax(18rem,1fr)_repeat(3,7.5rem)]";

function RemarkTemplateItem({
  template,
  variant,
  onToggleDefault,
  settingDefault,
  onDelete,
  onSaved,
}: {
  template: RemarkTemplate;
  variant: "card" | "row";
  onToggleDefault: (id: string, documentType: DocumentType) => void;
  settingDefault: boolean;
  onDelete: (id: string) => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation("documents");
  const { updateTemplate } = useRemarkTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RemarkTemplateForm>(
    templateToForm(template),
  );
  const [error, setError] = useState<string | null>(null);

  const original = templateToForm(template);
  const isDirty = !formsEqual(form, original);

  const set = useCallback(
    <K extends keyof RemarkTemplateForm>(
      key: K,
      value: RemarkTemplateForm[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  function openDialog() {
    setForm(original);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError(t("remarkTemplatesPanel.nameRequired"));
      return;
    }
    if (form.isDefault && form.defaultFor.length === 0) {
      setError(t("remarkTemplatesPanel.defaultDocumentTypeRequired"));
      return;
    }
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        data: {
          name: form.name.trim(),
          body: form.body.trim(),
          defaultFor: form.isDefault ? form.defaultFor : [],
        },
      });
      setError(null);
      setDialogOpen(false);
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("remarkTemplatesPanel.failedToSave"),
      );
    }
  }

  const actions = (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={t("remarkTemplatesPanel.edit")}
      >
        <Pencil size={15} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(template.id)}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={t("remarkTemplatesPanel.delete")}
      >
        <Trash2 size={15} strokeWidth={1.75} />
      </button>
    </>
  );

  return (
    <>
      {variant === "card" ? (
        <article className="rounded-xl border border-border-subtle bg-card p-3.5 sm:p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold leading-snug text-foreground">
                {template.name}
              </h4>
              {template.body ? (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {template.body}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
          </div>

          <div className="mt-3 border-t border-border-subtle pt-3">
            <p className="mb-2 text-2xs font-medium text-caption">
              {t("remarkTemplatesPanel.defaultFor")}
            </p>
            <RemarkDefaultChips
              template={template}
              onToggleDefault={onToggleDefault}
              settingDefault={settingDefault}
            />
          </div>
        </article>
      ) : (
        <div
          role="row"
          className={cn(
            TABLE_GRID,
            "border-b border-border-subtle last:border-b-0",
          )}
        >
          <div
            role="cell"
            className="flex min-w-0 items-start justify-between gap-4 px-5 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {template.name}
              </p>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {template.body || "—"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
          </div>

          {DOCUMENT_TYPE_ORDER.map((documentType) => {
            const selected = template.defaultFor.includes(documentType);
            const documentLabel = t(DOCUMENT_TYPE_KEYS[documentType]);
            return (
              <div
                key={documentType}
                role="cell"
                className="flex items-center justify-center border-l border-border-subtle px-3 py-4"
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={t(
                    selected
                      ? "remarkTemplatesPanel.unsetDefaultForDocumentType"
                      : "remarkTemplatesPanel.setDefaultForDocumentType",
                    { documentType: documentLabel },
                  )}
                  title={documentLabel}
                  disabled={settingDefault}
                  onClick={() => onToggleDefault(template.id, documentType)}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    selected
                      ? "border-primary-border bg-primary-soft text-primary hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
                      : "border-border-default text-caption hover:border-primary-border hover:bg-primary-soft hover:text-primary",
                    settingDefault && "opacity-50",
                  )}
                >
                  {selected ? (
                    <Check size={13} aria-hidden="true" />
                  ) : (
                    <Minus size={12} aria-hidden="true" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(85vh,600px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
            <DialogTitle className="font-semibold">
              {t("remarkTemplatesPanel.editTemplateTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("remarkTemplatesPanel.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {error && <InlineError message={error} />}
            <RemarkTemplateFields
              form={form}
              idPrefix={`remark-${template.id}`}
              autoFocus
              set={set}
            />
          </div>
          <div className="drawer-footer">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {t("remarkTemplatesPanel.cancel")}
            </button>
            <button
              type="button"
              disabled={!isDirty || updateTemplate.isPending}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
            >
              {updateTemplate.isPending && (
                <Loader2 size={13} className="animate-spin" />
              )}
              {t("remarkTemplatesPanel.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewRemarkTemplateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation("documents");
  const { createTemplate } = useRemarkTemplates();
  const [form, setForm] = useState<RemarkTemplateForm>(emptyTemplateForm());
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    <K extends keyof RemarkTemplateForm>(
      key: K,
      value: RemarkTemplateForm[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  async function handleCreate() {
    if (!form.name.trim()) {
      setError(t("remarkTemplatesPanel.nameRequired"));
      return;
    }
    if (form.isDefault && form.defaultFor.length === 0) {
      setError(t("remarkTemplatesPanel.defaultDocumentTypeRequired"));
      return;
    }
    try {
      await createTemplate.mutateAsync({
        name: form.name.trim(),
        body: form.body.trim(),
        defaultFor: form.isDefault ? form.defaultFor : [],
      });
      setForm(emptyTemplateForm());
      setError(null);
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("remarkTemplatesPanel.failedToSave"),
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setForm(emptyTemplateForm());
          setError(null);
        }
      }}
    >
      <DialogContent className="flex max-h-[min(85vh,600px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold">
            {t("remarkTemplatesPanel.newTemplate")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("remarkTemplatesPanel.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {error && <InlineError message={error} />}
          <RemarkTemplateFields
            form={form}
            idPrefix="new-remark"
            autoFocus
            set={set}
          />
        </div>
        <div className="drawer-footer">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
          >
            {t("remarkTemplatesPanel.cancel")}
          </button>
          <button
            type="button"
            disabled={createTemplate.isPending}
            onClick={() => void handleCreate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
          >
            {createTemplate.isPending && (
              <Loader2 size={13} className="animate-spin" />
            )}
            {t("remarkTemplatesPanel.create")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RemarkTemplatesPanel() {
  const { t } = useTranslation("documents");
  const {
    remarkTemplates,
    isLoading,
    isError,
    refetch,
    deleteTemplate,
    toggleDefault,
  } = useRemarkTemplates();
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <SectionHeader
          title={t("remarkTemplatesPanel.sectionTitle")}
          description={t("remarkTemplatesPanel.sectionDescription")}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setAdding(true)}
        >
          <Plus size={13} />
          {t("remarkTemplatesPanel.addTemplate")}
        </Button>
      </div>

      {isLoading ? (
        <RemarkTemplatesPanelSkeleton />
      ) : isError ? (
        <div className="space-y-2 rounded-xl border border-dashed border-danger/30 py-8 text-center">
          <p className="text-sm text-danger">
            {t("remarkTemplatesPanel.couldNotLoad")}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("remarkTemplatesPanel.retry")}
          </Button>
        </div>
      ) : remarkTemplates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default px-4 py-8 text-center text-xs text-muted-foreground">
          {t("remarkTemplatesPanel.noRemarksYet")}
        </div>
      ) : (
        <>
          <div
            role="list"
            aria-label={t("remarkTemplatesPanel.sectionTitle")}
            className="flex flex-col gap-2.5 md:hidden"
          >
            {remarkTemplates.map((template) => (
              <div key={template.id} role="listitem">
                <RemarkTemplateItem
                  template={template}
                  variant="card"
                  onToggleDefault={(id, documentType) =>
                    toggleDefault.mutate({ id, documentType })
                  }
                  settingDefault={toggleDefault.isPending}
                  onDelete={(id) => setDeleteId(id)}
                  onSaved={() => refetch()}
                />
              </div>
            ))}
          </div>

          <div
            role="table"
            aria-label={t("remarkTemplatesPanel.sectionTitle")}
            className="hidden overflow-x-auto rounded-xl border border-border-subtle bg-surface-card md:block"
          >
            <div
              role="row"
              className={cn(
                TABLE_GRID,
                "border-b border-border-subtle bg-surface-raised/50",
              )}
            >
              <div
                role="columnheader"
                className="px-5 py-3 text-2xs font-medium text-caption"
              >
                {t("remarkTemplatesPanel.sectionTitle")}
              </div>
              {DOCUMENT_TYPE_ORDER.map((documentType) => (
                <div
                  key={documentType}
                  role="columnheader"
                  className="border-l border-border-subtle px-3 py-3 text-center text-2xs font-medium text-caption"
                >
                  {t(DOCUMENT_TYPE_KEYS[documentType])}
                </div>
              ))}
            </div>
            {remarkTemplates.map((template) => (
              <RemarkTemplateItem
                key={template.id}
                template={template}
                variant="row"
                onToggleDefault={(id, documentType) =>
                  toggleDefault.mutate({ id, documentType })
                }
                settingDefault={toggleDefault.isPending}
                onDelete={(id) => setDeleteId(id)}
                onSaved={() => refetch()}
              />
            ))}
          </div>
        </>
      )}

      <NewRemarkTemplateDialog
        open={adding}
        onOpenChange={setAdding}
        onCreated={() => {
          setAdding(false);
          refetch();
        }}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={t("remarkTemplatesPanel.deleteConfirmTitle")}
        description={t("remarkTemplatesPanel.deleteConfirmDescription")}
        onConfirm={() => {
          if (deleteId) deleteTemplate.mutate(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
