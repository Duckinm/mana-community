import { DocumentPreviewSheet } from "@/components/documents/wizard/document-preview-sheet";
import { PreviewLangToggle } from "@/components/documents/wizard/preview-lang-toggle";
import type { PreviewLang } from "@/components/documents/preview/preview-labels";
import { ArrowLeft, ArrowRight, ChevronLeft, Eye } from "@/components/icons";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const STEP_VARIANTS: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -24 : 24,
    opacity: 0,
    transition: { duration: 0.12 },
  }),
};

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 18 : 6,
            backgroundColor:
              i < current
                ? "var(--success)"
                : i === current
                  ? "var(--primary)"
                  : "var(--border-strong)",
          }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}

export interface PromotionPageShellProps {
  title: string;
  subtitle: string;
  defaultLang: PreviewLang;
  preview: (lang: PreviewLang) => ReactNode;
  step: number;
  direction: number;
  totalSteps: number;
  stepLabels: string[];
  canAdvance: boolean;
  isLastStep: boolean;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
}

export function PromotionPageShell({
  title,
  subtitle,
  defaultLang,
  preview,
  step,
  direction,
  totalSteps,
  stepLabels,
  canAdvance,
  isLastStep,
  onCancel,
  onBack,
  onNext,
  children,
}: PromotionPageShellProps) {
  const { t } = useTranslation("documents");
  const isFirstStep = step === 0;
  const [previewLang, setPreviewLang] = useState<PreviewLang>(defaultLang);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="flex h-full w-full">
      <div className="flex w-full min-w-0 flex-col overflow-hidden lg:w-[40%] lg:border-r lg:border-dashed lg:border-border-strong">
        <div className="flex shrink-0 items-center justify-between px-6 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center gap-1 text-xs text-caption transition-colors duration-fast hover:text-muted-foreground lg:min-h-0"
          >
            <ChevronLeft size={12} />
            {t("documentWizard.back")}
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs text-caption transition-colors duration-fast hover:text-foreground lg:hidden lg:min-h-0"
          >
            <Eye size={12} strokeWidth={2} />
            {t("documentWizard.preview")}
          </button>
        </div>

        <div className="shrink-0 px-6 pt-4 md:px-8">
          <h1 className="flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold text-foreground">
            {title}
            <span className="text-sm font-normal text-muted-foreground">
              {subtitle}
            </span>
          </h1>
          {totalSteps > 1 && (
            <div className="mt-3">
              <StepDots current={step} total={totalSteps} />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={STEP_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-3"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="shrink-0 border-t border-dashed border-border-strong p-4 max-xl:pb-mobile-dock md:px-8 xl:pb-8">
          <div className="flex items-stretch gap-1">
            <div className="flex-1">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex w-full flex-col gap-0.5 rounded-md p-3 text-left transition-colors hover:bg-surface-raised"
                >
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowLeft size={12} />
                    {t("formSteps.back")}
                  </span>
                  <span className="text-sm font-medium text-caption">
                    {stepLabels[step - 1]}
                  </span>
                </button>
              )}
            </div>
            <div className="flex-1">
              {!isLastStep && (
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canAdvance}
                  className="flex w-full flex-col items-end gap-0.5 rounded-md p-3 text-right transition-colors hover:bg-surface-raised disabled:opacity-50"
                >
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {t("formSteps.next")}
                    <ArrowRight size={12} />
                  </span>
                  <span className="text-sm font-medium text-caption">
                    {stepLabels[step + 1]}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden flex-1 items-start justify-center overflow-y-auto bg-[radial-gradient(var(--border-default)_1px,transparent_1px)] p-8 pt-14 [background-size:16px_16px] lg:flex">
        <div className="absolute top-4 right-4 z-10">
          <PreviewLangToggle value={previewLang} onChange={setPreviewLang} />
        </div>
        <div className="w-[595px] max-w-full shrink-0">
          {preview(previewLang)}
        </div>
      </div>

      <DocumentPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        previewLang={previewLang}
        onPreviewLangChange={setPreviewLang}
      >
        {preview(previewLang)}
      </DocumentPreviewSheet>
    </div>
  );
}
