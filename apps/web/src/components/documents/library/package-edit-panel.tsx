import { GROUP_COLORS } from "@/components/documents/library/group-colors";
import { TemplateThumb } from "@/components/documents/library/template-gallery-card";
import {
  formatPrice,
  formatQty,
} from "@/components/documents/library/template-helpers";
import { TemplatePickerModal } from "@/components/documents/library/template-picker-modal";
import { ArrowLeft, Plus, Smile, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useItemTemplateGroups,
  type ItemTemplateGroup,
} from "@/hooks/use-item-template-groups";
import type { ItemTemplate } from "@/hooks/use-item-templates";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const inputCls =
  "w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-warning";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function PackageEditPanel({
  group,
  allTemplates,
  onBack,
  hideBack,
}: {
  group: ItemTemplateGroup | null;
  allTemplates: ItemTemplate[];
  onBack: () => void;
  /** Hide the back arrow — modal host provides its own close button. */
  hideBack?: boolean;
}) {
  const {
    createGroup,
    updateGroup,
    deleteGroup,
    addMembers,
    removeMember,
    isCreating,
    isUpdating,
  } = useItemTemplateGroups();
  const { t } = useTranslation("documents");
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [color, setColor] = useState(group?.color ?? "amber");
  const [icon, setIcon] = useState<string | null>(group?.icon ?? null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<Set<string>>(
    new Set(group?.templates.map((t) => t.id) ?? []),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, [group?.id]);

  const availableTemplates = allTemplates.filter((t) => !memberIds.has(t.id));

  function toggleMember(id: string) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const newIds = [...memberIds];

    if (group) {
      await updateGroup({
        id: group.id,
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
      });
      const existing = new Set(group.templates.map((t) => t.id));
      const toAdd = newIds.filter((id) => !existing.has(id));
      const toRemove = [...existing].filter((id) => !memberIds.has(id));
      if (toAdd.length) await addMembers(group.id, toAdd);
      for (const id of toRemove) await removeMember(group.id, id);
    } else {
      await createGroup({
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        templateIds: newIds,
      });
    }
    onBack();
  }

  const saving = isCreating || isUpdating;

  return (
    <form onSubmit={handleSave} className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle flex-shrink-0">
        {!hideBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
        )}
        <span className="text-sm font-semibold text-foreground">
          {group
            ? t("templateLibrary.editPackage")
            : t("templateLibrary.newPackage")}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex gap-2 items-end">
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen} modal={false}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title={t("templateLibrary.pickIcon")}
                className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
                  icon
                    ? "border-border text-lg bg-surface-raised hover:bg-surface-overlay"
                    : "border-border-subtle text-muted-foreground hover:text-foreground hover:border-border hover:bg-surface-raised"
                }`}
              >
                {icon ? <span>{icon}</span> : <Smile size={16} />}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="p-0 w-auto border border-border-subtle bg-surface-overlay shadow-popup"
              onWheel={(e) => e.stopPropagation()}
            >
              <EmojiPicker
                className="w-[260px] bg-surface-card"
                onEmojiSelect={(selected) => {
                  setIcon(selected.emoji);
                  setEmojiOpen(false);
                }}
              >
                <EmojiPickerSearch />
                <EmojiPickerContent />
                <EmojiPickerFooter />
              </EmojiPicker>
              {icon && (
                <div className="border-t border-border-subtle px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIcon(null);
                      setEmojiOpen(false);
                    }}
                    className="text-2xs text-muted-foreground hover:text-danger transition-colors"
                  >
                    {t("templateLibrary.removeIcon")}
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <div className="flex-1">
            <Field label={t("templateLibrary.packageNameRequired")}>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("templateLibrary.packageNamePlaceholder")}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("templateLibrary.color")}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {GROUP_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                title={t(`groupColors.${c.id}`)}
                className={`w-5 h-5 rounded-full transition-all ${c.dot} ${
                  color === c.id
                    ? `ring-2 ring-offset-2 ring-offset-surface-card ${c.ring}`
                    : "opacity-70 hover:opacity-100"
                }`}
              />
            ))}
          </div>
        </div>

        <Field label={t("templateLibrary.description")}>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("templateLibrary.descriptionOptional")}
            className={inputCls}
          />
        </Field>

        <div className="flex flex-col gap-3 flex-1">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              {t("templateLibrary.inThisPackage")}{" "}
              {memberIds.size > 0 && `(${memberIds.size})`}
            </p>
            {memberIds.size === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                {t("templateLibrary.noneYetAddBelow")}
              </p>
            ) : (
              <div className="rounded-xl border border-border-subtle overflow-hidden divide-y divide-border-subtle">
                {allTemplates
                  .filter((tpl) => memberIds.has(tpl.id))
                  .map((tpl) => (
                    <div
                      key={tpl.id}
                      className="group flex items-center gap-2.5 px-2.5 py-2 bg-surface-raised"
                    >
                      <TemplateThumb template={tpl} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {tpl.name}
                        </p>
                        <p className="text-2xs text-muted-foreground/70 tabular-nums">
                          {formatPrice(tpl.defaultUnitPriceCents, tpl.currency)}{" "}
                          × {formatQty(tpl.defaultQty)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMember(tpl.id)}
                        title={t("templateLibrary.removeFromPackage")}
                        className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                        tabIndex={-1}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {availableTemplates.length > 0 && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => setPickerOpen(true)}
              >
                <Plus size={12} />
                {t("templateLibrary.addFromTemplate")}
                <span className="text-muted-foreground">
                  ({availableTemplates.length})
                </span>
              </Button>
            </div>
          )}

          <TemplatePickerModal
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            templates={availableTemplates}
            onPick={(id) => toggleMember(id)}
          />

          {allTemplates.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              {t("templateLibrary.noTemplatesYetCreateFirst")}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border-subtle flex-shrink-0">
        {group && (
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="text-xs text-danger hover:underline mr-auto"
          >
            {t("templateLibrary.deletePackage")}
          </button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="ml-auto"
        >
          {t("templateLibrary.cancel")}
        </Button>
        <Button
          type="submit"
          variant="solid"
          size="sm"
          disabled={saving || !name.trim()}
        >
          {saving ? t("templateLibrary.saving") : t("templateLibrary.save")}
        </Button>
      </div>
      <DeleteConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t("templateLibrary.deletePackageTitle")}
        description={t("templateLibrary.deletePackageDescription")}
        onConfirm={() => {
          if (group) {
            deleteGroup(group.id);
            onBack();
          }
        }}
      />
    </form>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────
