import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StepIdentity } from "./step-identity";
import { StepGoals } from "./step-goals";
import { StepFinish } from "./step-finish";
import { saveOnboardingProfile } from "./draft";
import type { OnboardingData, StepProps } from "./types";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fireConfetti } from "@/hooks/use-confetti";

const INITIAL_DATA: OnboardingData = {
  freelancerType: "",
  freelancerTypeOther: "",
  hourlyRate: "",
  currency: "THB",
  revenueGoal: "",
  activeProjects: "",
  painPoints: [],
  painPointOther: "",
  heardFrom: "",
};

const TOTAL_STEPS = 3;

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48, filter: "blur(4px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48, filter: "blur(4px)" }),
};

function StepDots({ current, label }: { current: number; label: string }) {
  const percent = Math.round(((current + 1) / TOTAL_STEPS) * 100);
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
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
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="text-xs font-medium text-muted-foreground">
        {percent}%
      </span>
    </div>
  );
}

export function OnboardingFlow({
  onComplete,
  initialData,
  onDataChange,
  finalStep,
  onDismiss,
  onSubmit = saveOnboardingProfile,
  submitLabel,
  canSubmit,
}: {
  onComplete?: () => void;
  initialData?: Partial<OnboardingData>;
  onDataChange?: (data: OnboardingData) => void;
  finalStep?: (data: OnboardingData) => ReactNode;
  onDismiss?: () => void;
  onSubmit?: (data: OnboardingData) => Promise<unknown>;
  submitLabel?: string;
  canSubmit?: (data: OnboardingData) => boolean;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    ...INITIAL_DATA,
    ...initialData,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { t } = useTranslation("onboarding");

  function onChange(patch: Partial<OnboardingData>) {
    const next = { ...data, ...patch };
    setData(next);
    onDataChange?.(next);
  }

  function next() {
    setDirection(1);
    setStep((s) => s + 1);
  }

  function back() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(data);
      fireConfetti();
      onComplete?.();
    } catch {
      setSubmitError(t("finish.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels = [
    t("steps.profile"),
    t("steps.preferences"),
    t("steps.account"),
  ];
  const stepProps: StepProps = { data, onChange, onNext: next, onBack: back };
  const isFinalStep = step === TOTAL_STEPS - 1;
  const submitAllowed = canSubmit?.(data) ?? true;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDismiss?.();
      }}
    >
      <DialogContent
        className="flex h-[min(85vh,560px)] max-w-lg flex-col gap-0 overflow-hidden p-0"
        hideCloseButton={!onDismiss}
      >
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pt-5 pb-3 pr-14">
          <DialogTitle>{t("flow.title")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-5">
            <StepDots current={step} label={stepLabels[step]} />
          </div>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto w-full max-w-md"
            >
              {step === 0 && <StepIdentity {...stepProps} />}
              {step === 1 && <StepGoals {...stepProps} />}
              {step === 2 &&
                (finalStep ? finalStep(data) : <StepFinish data={data} />)}
            </motion.div>
          </AnimatePresence>
        </div>
        {submitError && (
          <p className="border-t border-border px-5 pt-3 text-xs text-danger">
            {submitError}
          </p>
        )}
        <div className={cn("drawer-footer", step > 0 && "justify-between")}>
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {t("actions.back")}
            </button>
          )}
          <button
            type="button"
            onClick={() => void (isFinalStep ? submit() : next())}
            disabled={submitting || (isFinalStep && !submitAllowed)}
            className={
              isFinalStep
                ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                : "rounded-lg border border-primary-border bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary-border active:scale-95 disabled:opacity-30"
            }
          >
            {isFinalStep
              ? submitting
                ? t("finish.saving")
                : (submitLabel ?? t("actions.submit"))
              : t("actions.continue")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
