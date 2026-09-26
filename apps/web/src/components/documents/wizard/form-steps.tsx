import type { DocumentType } from "@/components/documents/types";
import { useWizardStepMeta } from "@/components/documents/wizard/use-wizard-step-meta";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { useTranslation } from "react-i18next";

interface FormStepsProps {
  step: string;
  documentType: DocumentType;
  onStepChange: (step: string) => void;
  onNext: () => void;
}

export function FormSteps({
  step,
  documentType,
  onStepChange,
  onNext,
}: FormStepsProps) {
  const { t } = useTranslation("documents");
  const STEPS = useWizardStepMeta(documentType);

  const currentIndex = STEPS.findIndex((s) => s.step === step);
  const prev = currentIndex > 0 ? STEPS[currentIndex - 1] : null;
  const next = currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-1">
        <div className="flex-1">
          {prev && (
            <button
              type="button"
              onClick={() => onStepChange(prev.step)}
              className="flex w-full flex-col gap-0.5 rounded-md p-3 text-left transition-colors hover:bg-surface-raised"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeft size={12} />
                {t("formSteps.back")}
              </span>
              <span className="text-sm font-medium text-caption">
                {prev.title}
              </span>
            </button>
          )}
        </div>

        <div className="flex-1">
          {next && (
            <button
              type="button"
              onClick={onNext}
              className="flex w-full flex-col gap-0.5 rounded-md p-3 text-right items-end transition-colors hover:bg-surface-raised"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {t("formSteps.next")}
                <ArrowRight size={12} />
              </span>
              <span className="text-sm font-medium text-caption">
                {next.title}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
