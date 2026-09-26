import { ArrowRight, CheckCircle2, X } from "@/components/icons";
import {
  STEP_ICONS,
  STEP_KEYS,
  STEP_PATHS,
  TOTAL_STEPS,
  navigateToStep,
  quickstartActiveKey,
  useGetStarted,
  type StepKey,
} from "@/components/onboarding/get-started-steps";
import { Button } from "@/components/ui/button";
import { motionTransition } from "@/lib/motion";
import {
  useNavigate,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const FINISH_MS = 2400;

function StepDots({
  done,
  skipped,
  currentKey,
}: {
  done: Record<StepKey, boolean>;
  skipped: StepKey[];
  currentKey: StepKey | undefined;
}) {
  return (
    <div className="flex items-center gap-1">
      {STEP_KEYS.map((key) => (
        <motion.span
          key={key}
          animate={{
            width: key === currentKey ? 16 : 5,
            backgroundColor: done[key]
              ? "var(--success)"
              : key === currentKey
                ? "var(--primary)"
                : skipped.includes(key)
                  ? "var(--border-default)"
                  : "var(--border-strong)",
          }}
          transition={motionTransition(0.25)}
          className="h-1 rounded-full"
        />
      ))}
    </div>
  );
}

export function QuickstartBar() {
  const { userId } = useRouteContext({ from: "/_app" });
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const activeKey = quickstartActiveKey(userId);
  const skippedKey = `get-started:quickstart-skipped:${userId}`;

  const [active, setActive] = useState(
    () => localStorage.getItem(activeKey) === "1",
  );
  const [skipped, setSkipped] = useState<StepKey[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(skippedKey) ?? "[]");
      return Array.isArray(raw)
        ? STEP_KEYS.filter((key) => raw.includes(key))
        : [];
    } catch {
      return [];
    }
  });
  const [finishing, setFinishing] = useState(false);

  const { data, done } = useGetStarted(active);

  const currentKey = STEP_KEYS.find(
    (key) => !done[key] && !skipped.includes(key),
  );
  const stepNumber = currentKey
    ? STEP_KEYS.indexOf(currentKey) + 1
    : TOTAL_STEPS;
  const onStepPage = currentKey
    ? pathname.startsWith(STEP_PATHS[currentKey])
    : false;

  function exit() {
    localStorage.removeItem(activeKey);
    localStorage.removeItem(skippedKey);
    setActive(false);
  }

  useEffect(() => {
    if (!active || !data || currentKey) return;
    setFinishing(true);
    const timeout = setTimeout(() => {
      localStorage.removeItem(activeKey);
      localStorage.removeItem(skippedKey);
      setActive(false);
    }, FINISH_MS);
    return () => clearTimeout(timeout);
  }, [active, data, currentKey, activeKey, skippedKey]);

  function skipCurrent() {
    if (!currentKey) return;
    const next = [...skipped, currentKey];
    setSkipped(next);
    localStorage.setItem(skippedKey, JSON.stringify(next));
  }

  const Icon = currentKey ? STEP_ICONS[currentKey] : CheckCircle2;

  return (
    <AnimatePresence>
      {active && !!data && (
        <motion.aside
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={motionTransition()}
          className="surface fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 w-80 max-w-[calc(100vw-2rem)] shadow-popup md:bottom-4 md:z-40"
        >
          {finishing || !currentKey ? (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                <CheckCircle2 size={16} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-medium text-foreground">
                  {t("quickstart.doneTitle")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("quickstart.doneSubtitle")}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-caption">
                    {t("quickstart.stepCount", {
                      current: stepNumber,
                      total: TOTAL_STEPS,
                    })}
                  </span>
                  <StepDots
                    done={done}
                    skipped={skipped}
                    currentKey={currentKey}
                  />
                </div>
                <button
                  type="button"
                  onClick={exit}
                  aria-label={t("quickstart.exit")}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-surface-raised hover:text-foreground"
                >
                  <X size={13} strokeWidth={1.75} />
                </button>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentKey}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={motionTransition(0.2)}
                  className="mt-2.5 flex items-start gap-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon size={15} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] font-medium text-foreground">
                      {t(`getStarted.steps.${currentKey}.title`)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(`getStarted.steps.${currentKey}.description`)}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={skipCurrent}
                  className="text-xs text-muted-foreground transition-colors duration-fast hover:text-foreground"
                >
                  {t("quickstart.skip")}
                </button>
                {!onStepPage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="solid"
                    onClick={() => navigateToStep(navigate, currentKey)}
                  >
                    {t("quickstart.go")}
                    <ArrowRight size={13} strokeWidth={2} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
