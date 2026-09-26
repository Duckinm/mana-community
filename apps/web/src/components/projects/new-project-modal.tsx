import type { Contact } from "@/components/contacts/types";
import { ColorEmojiPicker } from "@/components/projects/color-emoji-picker";
import { nextUnusedProjectColor } from "@/components/projects/constants";
import { NewProjectMilestoneDrafts } from "@/components/projects/new-project-milestone-drafts";
import type {
  NewProjectInput,
  NewProjectMilestoneDraft,
} from "@/components/projects/new-project-types";
import { ProjectDescriptionEditor } from "@/components/projects/project-description-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContacts } from "@/context/contacts";
import i18next from "@/lib/i18n";
import type { TiptapDoc } from "@/lib/rich-text";
import { fieldError } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const newProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, {
      message: i18next.t("newProject.nameRequired", { ns: "projects" }),
    }),
  objective: z.string(),
  milestones: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        dueDate: z.string().optional(),
      }),
    )
    .refine((ms) => ms.every((m) => m.name.trim().length > 0), {
      message: i18next.t("newProject.milestoneNameRequired", {
        ns: "projects",
      }),
    }),
});

function clientLabelFromContact(contact: Contact): string {
  return contact.company.trim() || contact.name;
}

export function NewProjectModal({
  onClose,
  onCreate,
  usedColors,
}: {
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void | Promise<void>;
  usedColors: string[];
}) {
  const { t } = useTranslation("projects");
  const { contacts } = useContacts();
  const [color, setColor] = useState(() => nextUnusedProjectColor(usedColors));
  const [icon, setIcon] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  // recursive doc types blow up TanStack Form's DeepKeys inference, so the editor owns this value
  const [description, setDescription] = useState<TiptapDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      objective: "",
      milestones: [] as NewProjectMilestoneDraft[],
    },
    validators: { onSubmit: newProjectSchema },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      try {
        const name = value.name.trim();
        const contact = contactId
          ? contacts.find((c) => c.id === contactId)
          : undefined;
        await onCreate({
          name,
          contactId,
          client: contact ? clientLabelFromContact(contact) : name,
          color,
          icon,
          objective: value.objective.trim(),
          description,
          milestones: value.milestones.map((m) => ({
            name: m.name.trim(),
            dueDate: m.dueDate,
          })),
        });
        onClose();
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(85vh,560px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3">
          <DialogTitle className="font-semibold">
            {t("newProject.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("newProject.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="flex items-start gap-2">
              <form.Subscribe selector={(s) => s.values.name}>
                {(name) => (
                  <ColorEmojiPicker
                    icon={icon}
                    color={color}
                    name={name}
                    size={32}
                    className="mt-0.5"
                    onIconChange={setIcon}
                    onColorChange={setColor}
                  />
                )}
              </form.Subscribe>

              <div className="min-w-0 flex-1 space-y-0.5">
                <form.Field name="name">
                  {(field) => (
                    <div>
                      <Input
                        id="project-name"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder={t("newProject.namePlaceholder")}
                        autoFocus
                        className="h-auto rounded-md border-0 bg-transparent px-2 py-1 text-base font-semibold shadow-none focus-visible:ring-0"
                      />
                      {field.state.meta.isTouched &&
                        fieldError(field.state.meta.errors) && (
                          <p className="mt-1 text-xs text-danger">
                            {fieldError(field.state.meta.errors)}
                          </p>
                        )}
                    </div>
                  )}
                </form.Field>

                <form.Field name="objective">
                  {(field) => (
                    <Input
                      id="project-objective"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("newProject.overviewPlaceholder")}
                      className="h-auto rounded-md border-0 bg-transparent px-2 py-1 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
                    />
                  )}
                </form.Field>
              </div>
            </div>

            <div className="border-b border-border-subtle py-2">
              <Select
                value={contactId ?? "__none__"}
                onValueChange={(id) =>
                  setContactId(id === "__none__" ? null : id)
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-full max-w-52 border-border-subtle bg-surface-input"
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
            </div>

            <ProjectDescriptionEditor
              value={description}
              onChange={setDescription}
              placeholder={t("newProject.descriptionPlaceholder")}
              debounceMs={0}
              className="min-h-20 pt-1 text-xs [&_.ProseMirror]:min-h-20"
            />

            <form.Field name="milestones">
              {(field) => {
                const error = fieldError(field.state.meta.errors);
                return (
                  <div>
                    <NewProjectMilestoneDrafts
                      milestones={field.state.value}
                      onChange={field.handleChange}
                      showEmptyErrors={Boolean(error)}
                    />
                    {error && (
                      <p className="mt-1 text-xs text-danger">{error}</p>
                    )}
                  </div>
                );
              }}
            </form.Field>
          </div>

          <div className="drawer-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {t("newProject.cancel")}
            </button>
            <form.Subscribe
              selector={(s) =>
                [
                  s.values.name,
                  s.canSubmit,
                  s.values.milestones.length,
                ] as const
              }
            >
              {([name, canSubmit, milestoneCount]) => (
                <button
                  type="submit"
                  disabled={!name.trim() || !canSubmit || submitting}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                >
                  {submitting
                    ? t("newProject.creating")
                    : milestoneCount > 0
                      ? t("newProject.createWithMilestones", {
                          count: milestoneCount,
                        })
                      : t("newProject.create")}
                </button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
