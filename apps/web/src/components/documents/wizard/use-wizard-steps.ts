import { useStore } from "@tanstack/react-form";
import type { WizardForm } from "@/components/documents/wizard/document-wizard-state";
import type { DocumentType } from "@/components/documents/types";
import { getWizardSteps } from "@/components/documents/wizard/wizard-step-config";

export interface WizardStepsHandle {
  currentStep: string;
  currentIndex: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
  goTo: (step: string) => void;
}

export function useWizardSteps(
  form: WizardForm,
  documentType: DocumentType,
): WizardStepsHandle {
  const steps = getWizardSteps(documentType);
  const currentStep = useStore(form.store, (s) => s.values.step) as string;
  const currentIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= totalSteps - 1;

  function next() {
    if (!isLast) {
      form.setFieldValue("step", steps[currentIndex + 1]);
    }
  }

  function back() {
    if (!isFirst) {
      form.setFieldValue("step", steps[currentIndex - 1]);
    }
  }

  function goTo(step: string) {
    if (steps.includes(step)) {
      form.setFieldValue("step", step);
    }
  }

  return {
    currentStep,
    currentIndex,
    totalSteps,
    isFirst,
    isLast,
    next,
    back,
    goTo,
  };
}
