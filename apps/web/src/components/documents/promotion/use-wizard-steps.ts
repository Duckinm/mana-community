import { useState } from "react";

export function useWizardSteps(totalSteps: number) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  function navigate(dir: 1 | -1) {
    setDirection(dir);
    setStep((s) => s + dir);
  }

  return {
    step,
    direction,
    totalSteps,
    isFirstStep: step === 0,
    isLastStep: step === totalSteps - 1,
    back: () => navigate(-1),
    next: () => navigate(1),
  };
}
