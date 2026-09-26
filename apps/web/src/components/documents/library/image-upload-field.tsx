import { Camera, ImageIcon, Loader2, X } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ImageUploadFieldProps {
  label: string;
  /** Presigned URL of the stored image, or null. */
  imageUrl: string | null | undefined;
  /** Upload the file and return the new presigned URL. Absent until the owner exists. */
  onUpload?: (file: File) => Promise<string | null>;
  onRemove?: () => Promise<void>;
  /** Called with the new URL after upload, or null after removal. */
  onChange: (url: string | null) => void;
  /** No owner id yet (create flow): hold the file for the caller to upload post-create. */
  onPendingFileChange?: (file: File | null) => void;
  /** Signatures look best on a transparent tile, not cropped/cover. */
  contain?: boolean;
  hint?: string;
  /** Tailwind aspect-ratio class for the preview tile. Defaults to 16:9. */
  aspectClassName?: string;
}

export function ImageUploadField({
  label,
  imageUrl,
  onUpload,
  onRemove,
  onChange,
  onPendingFileChange,
  contain = false,
  hint,
  aspectClassName = "aspect-[16/9]",
}: ImageUploadFieldProps) {
  const { t } = useTranslation("documents");
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
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!onUpload) {
      setLocalPreview(file);
      onPendingFileChange?.(file);
      return;
    }

    setLocalPreview(file);
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
      setLocalPreview(null);
    } catch {
      setLocalPreview(null);
      onChange(imageUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!onRemove) {
      setLocalPreview(null);
      onPendingFileChange?.(null);
      onChange(null);
      return;
    }
    setUploading(true);
    try {
      await onRemove();
      setLocalPreview(null);
      onChange(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <div
        className={`group relative ${aspectClassName} overflow-hidden rounded-xl border border-border-subtle bg-muted/30`}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={label}
            className={`h-full w-full ${contain ? "object-contain p-3" : "object-cover"}`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/70">
            <ImageIcon size={26} strokeWidth={1.5} />
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
              {displayUrl
                ? t("templateImageField.change")
                : t("templateImageField.upload")}
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

      <div className="min-w-0">
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          {label}
        </label>
        {hint && (
          <p className="text-2xs leading-snug text-muted-foreground/80">
            {hint}
          </p>
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
