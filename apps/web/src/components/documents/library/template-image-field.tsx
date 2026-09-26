import { uploadTemplateImage, removeTemplateImage } from "@/lib/upload-template-image";
import { invalidateItemTemplates } from "@/lib/invalidate-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ImageIcon, Loader2, X } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface TemplateImageFieldProps {
  templateId: string | null;
  imageUrl: string | null | undefined;
  onImageChange: (url: string | null) => void;
  onPendingFileChange?: (file: File | null) => void;
  compact?: boolean;
  hideLabel?: boolean;
}

export function TemplateImageField({
  templateId,
  imageUrl,
  onImageChange,
  onPendingFileChange,
  compact = false,
  hideLabel = false,
}: TemplateImageFieldProps) {
  const { t } = useTranslation("documents");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const displayUrl = localPreviewUrl ?? imageUrl ?? null;

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  function setLocalPreview(file: File | null) {
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!templateId) {
      setLocalPreview(file);
      onPendingFileChange?.(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLocalPreview(file);
    setUploading(true);
    try {
      const url = await uploadTemplateImage(templateId, file);
      onImageChange(url);
      setLocalPreview(null);
      void invalidateItemTemplates(queryClient);
    } catch {
      setLocalPreview(null);
      onImageChange(imageUrl ?? null);
    } finally {
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemove() {
    if (!templateId) {
      setLocalPreview(null);
      onPendingFileChange?.(null);
      onImageChange(null);
      return;
    }
    setUploading(true);
    try {
      await removeTemplateImage(templateId);
      setLocalPreview(null);
      onImageChange(null);
      void invalidateItemTemplates(queryClient);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {!hideLabel && (
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          {t("templateImageField.productImage")}
        </label>
      )}
      <div
        className={`relative overflow-hidden rounded-xl border border-border-subtle bg-muted/30 group ${
          compact ? "aspect-[16/9]" : "aspect-[4/3]"
        }`}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Template preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/70">
            <ImageIcon size={28} strokeWidth={1.5} />
            <span className="text-2xs">{t("templateImageField.optionalShownInGallery")}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/35 disabled:cursor-wait"
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-white" />
          ) : (
            <span className="flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-2xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={13} />
              {displayUrl ? t("templateImageField.change") : t("templateImageField.upload")}
            </span>
          )}
        </button>

        {displayUrl && !uploading && (
          <button
            type="button"
            onClick={() => void handleRemove()}
            className="absolute top-2 right-2 rounded-md bg-black/50 p-1 text-white/90 backdrop-blur-sm hover:bg-black/65"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />
    </div>
  );
}
