import type { DocumentType } from "@/components/documents/types";
import { useWizardStepMeta } from "@/components/documents/wizard/use-wizard-step-meta";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface WizardProgressProps {
  step: string;
  documentType: DocumentType;
  onStepChange: (step: string) => void;
}

export function WizardProgress({
  step,
  documentType,
  onStepChange,
}: WizardProgressProps) {
  const { t } = useTranslation("documents");
  const STEPS = useWizardStepMeta(documentType);
  const currentIndex = STEPS.findIndex((s) => s.step === step);

  return (
    <div
      className="flex items-center gap-1.5 pb-6"
      aria-label={t("formSteps.progress")}
    >
      {STEPS.map((s, i) => {
        const isCurrent = s.step === step;
        return (
          <button
            key={s.step}
            type="button"
            onClick={() => onStepChange(s.step)}
            aria-current={isCurrent ? "step" : undefined}
            title={s.title}
          >
            <motion.div
              animate={{
                width: isCurrent ? 18 : 6,
                backgroundColor:
                  i < currentIndex
                    ? "var(--success)"
                    : isCurrent
                      ? "var(--primary)"
                      : "var(--border-strong)",
              }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="h-1.5 rounded-full"
            />
          </button>
        );
      })}
    </div>
  );
}
