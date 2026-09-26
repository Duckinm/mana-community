import { PreviewLangToggle } from "@/components/documents/wizard/preview-lang-toggle";
import { Eye, X } from "@/components/icons";
import { Sheet, SheetDragRegion } from "@/components/ui/sheet";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const PREVIEW_WIDTH = 595;

interface DocumentPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewLang: "th" | "en";
  onPreviewLangChange: (lang: "th" | "en") => void;
  children: ReactNode;
}

function ScaledDocumentPreview({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(842);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const width = container.clientWidth;
      setScale(Math.min(1, width / PREVIEW_WIDTH));
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const updateHeight = () => {
      setContentHeight(content.scrollHeight);
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="w-full px-3 pb-4 pt-1">
      {/* Measured separately from the padded parent — clientWidth includes
          padding, which would scale the card wider than the room it has. */}
      <div ref={containerRef} className="w-full">
        <div
          className="mx-auto overflow-hidden"
          style={{
            width: PREVIEW_WIDTH * scale,
            height: contentHeight * scale,
          }}
        >
          <div
            ref={contentRef}
            style={{
              width: PREVIEW_WIDTH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentPreviewSheet({
  open,
  onOpenChange,
  previewLang,
  onPreviewLangChange,
  children,
}: DocumentPreviewSheetProps) {
  const { t } = useTranslation("documents");

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      className="h-[min(92dvh,56rem)] pb-[env(safe-area-inset-bottom)]"
    >
      <SheetDragRegion className="flex shrink-0 items-center gap-2 px-3 pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground">
          <Eye size={16} strokeWidth={1.75} />
        </span>
        <p className="min-w-0 flex-1 text-left text-sm font-semibold tracking-tight">
          {t("documentWizard.previewSheetTitle")}
        </p>
        <PreviewLangToggle value={previewLang} onChange={onPreviewLangChange} />
        <button
          type="button"
          aria-label={t("documentWizard.closePreview")}
          onClick={() => onOpenChange(false)}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </SheetDragRegion>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(var(--border-default)_1px,transparent_1px)] [background-size:16px_16px]">
        <ScaledDocumentPreview>{children}</ScaledDocumentPreview>
      </div>
    </Sheet>
  );
}
