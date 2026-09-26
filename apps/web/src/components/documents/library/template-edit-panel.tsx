import { TemplateImageField } from "@/components/documents/library/template-image-field";
import { CURRENCIES } from "@/components/documents/ui/currency-combobox";
import { ArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useItemTemplates,
  type ItemTemplate,
} from "@/hooks/use-item-templates";
import { invalidateItemTemplates } from "@/lib/invalidate-helpers";
import { uploadTemplateImage } from "@/lib/upload-template-image";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const inputClassName =
  "w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-warning";

function toFixedPoint(value: string, fallback: number, min: number): number {
  const scaled = Math.round(parseFloat(value) * 100);
  return Math.max(min, Number.isFinite(scaled) ? scaled : fallback);
}

function toWholeQuantity(value: string): number {
  const units = Math.round(parseFloat(value));
  return Math.max(1, Number.isFinite(units) ? units : 1) * 100;
}

export function TemplateEditPanel({
  template,
  currency: defaultCurrency,
  onBack,
  hideBack,
}: {
  template: ItemTemplate | null;
  currency?: string;
  onBack: () => void;
  hideBack?: boolean;
}) {
  const {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    isCreating,
    isUpdating,
  } = useItemTemplates();
  const { t } = useTranslation("documents");
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [price, setPrice] = useState(
    template ? (template.defaultUnitPriceCents / 100).toString() : "",
  );
  const [qty, setQty] = useState(
    template ? (template.defaultQty / 100).toString() : "1",
  );
  const [currency, setCurrency] = useState(
    template?.currency ?? defaultCurrency ?? "THB",
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    template?.imageUrl ?? null,
  );
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [createMore, setCreateMore] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, [template?.id]);

  useEffect(() => {
    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
    setPrice(template ? (template.defaultUnitPriceCents / 100).toString() : "");
    setQty(template ? (template.defaultQty / 100).toString() : "1");
    setCurrency(template?.currency ?? defaultCurrency ?? "THB");
    setConfirmDeleteOpen(false);
  }, [template?.id, defaultCurrency]);

  useEffect(() => {
    setImageUrl(template?.imageUrl ?? null);
    setPendingImageFile(null);
  }, [template?.id, template?.imageUrl]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const body = {
      name: name.trim(),
      description: description.trim() || name.trim(),
      defaultQty: toWholeQuantity(qty),
      defaultUnitPriceCents: toFixedPoint(price, 0, 0),
      currency,
    };
    if (template) {
      await updateTemplate({ id: template.id, ...body });
    } else {
      const created = await createTemplate(body);
      if (pendingImageFile) {
        await uploadTemplateImage(created.id, pendingImageFile);
        void invalidateItemTemplates(queryClient);
      }
      if (createMore) {
        setName("");
        setDescription("");
        setPrice("");
        setQty("1");
        setImageUrl(null);
        setPendingImageFile(null);
        setFormKey((key) => key + 1);
        nameRef.current?.focus();
        return;
      }
    }
    onBack();
  }

  const saving = isCreating || isUpdating;

  return (
    <form
      onSubmit={handleSave}
      className="flex h-full flex-col bg-surface-card"
    >
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-3">
        {!hideBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={15} />
          </button>
        )}
        <span className="text-sm font-semibold text-foreground">
          {template
            ? t("templateLibrary.editTemplate")
            : t("templateLibrary.newTemplate")}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap gap-3">
          <div className="w-44 shrink-0">
            <TemplateImageField
              key={formKey}
              templateId={template?.id ?? null}
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              onPendingFileChange={setPendingImageFile}
              hideLabel
            />
          </div>
          <div className="flex min-w-[180px] flex-1 flex-col gap-3">
            <input
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("templateLibrary.namePlaceholder")}
              aria-label={t("templateLibrary.nameRequired")}
              className={inputClassName}
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("templateLibrary.descriptionPlaceholder")}
              aria-label={t("templateLibrary.description")}
              rows={3}
              className={cn(inputClassName, "flex-1 resize-none")}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="w-24 shrink-0 text-xs text-muted-foreground">
            {t("templateLibrary.unitPrice")}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="0.00"
            className={cn(inputClassName, "min-w-0 flex-1")}
          />
          {!defaultCurrency && (
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger
                aria-label={t("templateLibrary.currency")}
                className="h-[38px] w-24 shrink-0"
              >
                <SelectValue>{currency}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.value} — {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="w-24 shrink-0 text-xs text-muted-foreground">
            {t("templateLibrary.defaultQty")}
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            placeholder="1"
            className={cn(inputClassName, "min-w-0 flex-1")}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border-subtle px-4 py-3">
        {template ? (
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="mr-auto text-xs text-danger hover:underline"
          >
            {t("templateLibrary.delete")}
          </button>
        ) : (
          <label className="mr-auto flex cursor-pointer select-none items-center gap-2">
            <Switch
              checked={createMore}
              onCheckedChange={setCreateMore}
              size="sm"
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-accent"
            />
            <span className="text-xs text-muted-foreground">
              {t("templateLibrary.createMore")}
            </span>
          </label>
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
        title={t("templateLibrary.deleteTemplateTitle")}
        description={t("templateLibrary.deleteTemplateDescription")}
        onConfirm={() => {
          if (template) {
            deleteTemplate(template.id);
            onBack();
          }
        }}
      />
    </form>
  );
}
