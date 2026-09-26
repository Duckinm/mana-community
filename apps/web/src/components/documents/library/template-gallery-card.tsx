import { formatPrice } from "@/components/documents/library/template-helpers";
import { Check, ImageIcon, Pencil, Plus } from "@/components/icons";
import type { ItemTemplate } from "@/hooks/use-item-templates";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function TemplateImage({
  src,
  alt,
  width,
  height,
  blurDataUrl,
  onError,
}: {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  onError: () => void;
}) {
  const hasStoredSize = Boolean(width && height);
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const imageWidth = width ?? naturalSize?.width;
  const imageHeight = height ?? naturalSize?.height;
  const aspectRatio =
    imageWidth && imageHeight ? `${imageWidth} / ${imageHeight}` : undefined;

  return (
    <div
      className={`relative overflow-hidden bg-surface-raised ${
        aspectRatio ? "" : "aspect-4/3"
      }`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {blurDataUrl ? (
        <img
          src={blurDataUrl}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-500 ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : (
        !loaded && (
          <div className="absolute inset-0 animate-pulse bg-surface-raised" />
        )
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={onError}
        onLoad={(event) => {
          if (!hasStoredSize) {
            const image = event.currentTarget;
            setNaturalSize({
              width: image.naturalWidth,
              height: image.naturalHeight,
            });
          }
          setLoaded(true);
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

interface TemplateGalleryCardProps {
  template: ItemTemplate;
  currency: string;
  insertMode?: boolean;
  pickMode?: boolean;
  isSelected?: boolean;
  isEditing?: boolean;
  showCheckbox?: boolean;
  onClick: () => void;
  onToggleSelect?: () => void;
  onEdit?: () => void;
  onMouseEnter?: () => void;
}

export function TemplateGalleryCard({
  template,
  currency,
  insertMode = false,
  pickMode = false,
  isSelected = false,
  isEditing = false,
  showCheckbox = false,
  onClick,
  onToggleSelect,
  onEdit,
  onMouseEnter,
}: TemplateGalleryCardProps) {
  const { t } = useTranslation("documents");
  const displayCurrency = template.currency || currency;
  const priceLabel = formatPrice(
    template.defaultUnitPriceCents,
    displayCurrency,
  );
  const placeholderAspect = "aspect-[5/4]";
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`group relative flex flex-col overflow-hidden rounded-xl border cursor-pointer transition-all duration-base ${
        isSelected
          ? "border-warning/60 bg-warning/5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--warning)_30%,transparent)]"
          : isEditing
            ? "border-border-strong bg-surface-raised"
            : "border-border-subtle bg-surface-card hover:border-border-strong hover:bg-surface-raised hover:shadow-md"
      }`}
    >
      <div className="relative overflow-hidden bg-muted/40">
        {template.imageUrl && !imageFailed ? (
          <TemplateImage
            src={template.imageUrl}
            alt={template.name}
            width={template.imageWidth}
            height={template.imageHeight}
            blurDataUrl={template.imageBlurDataUrl}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className={`flex w-full flex-col items-center justify-center gap-2 bg-surface-raised ${placeholderAspect}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-surface-card/80 text-muted-foreground/60">
              <ImageIcon size={22} strokeWidth={1.5} />
            </div>
            <span className="text-2xs font-medium text-muted-foreground/70">
              {t("templateGalleryCard.noImage")}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/15 via-black/5 to-transparent px-2.5 pb-2 pt-8">
          <span className="inline-flex rounded-md bg-black/45 px-2 py-0.5 text-2xs font-semibold tabular-nums text-white backdrop-blur-sm">
            {priceLabel}
          </span>
        </div>

        {insertMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            className={`absolute top-2 left-2 z-10 flex h-4 w-4 items-center justify-center rounded border transition-all ${
              isSelected
                ? "border-warning bg-warning opacity-100"
                : showCheckbox
                  ? "border-white/80 bg-black/30 opacity-100"
                  : "border-white/80 bg-black/30 opacity-0 group-hover:opacity-100"
            }`}
          >
            {isSelected && (
              <Check size={9} className="text-white" strokeWidth={3} />
            )}
          </button>
        )}

        {onEdit && !insertMode && !pickMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={`absolute top-2 right-2 z-10 rounded-md border border-white/20 bg-black/40 p-1 text-white/90 backdrop-blur-sm transition-all hover:bg-black/55 ${
              isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            tabIndex={-1}
          >
            <Pencil size={11} />
          </button>
        )}

        {pickMode && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <span className="flex h-9 w-9 scale-90 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:scale-100 group-hover:opacity-100">
              <Plus size={18} strokeWidth={2.5} />
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
          {template.name}
        </p>
        {template.description && template.description !== template.name && (
          <p className="text-2xs text-muted-foreground leading-snug line-clamp-2">
            {template.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function TemplateThumb({
  template,
  className = "h-10 w-10",
}: {
  template: Pick<ItemTemplate, "id" | "name" | "imageUrl">;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (template.imageUrl && !failed) {
    return (
      <img
        src={template.imageUrl}
        alt={template.name}
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-lg object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-linear-to-br from-muted/50 to-surface-raised text-muted-foreground/50 ${className}`}
    >
      <ImageIcon size={14} strokeWidth={1.5} />
    </div>
  );
}
